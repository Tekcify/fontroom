const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const zlib = require("node:zlib");
const { JSDOM } = require("jsdom");
const preview = require("../lib/preview");

const listen = server => new Promise(r => server.listen(0, "127.0.0.1", () => r(`http://127.0.0.1:${server.address().port}`)));
const close = server => new Promise(r => server.close(r));

test("only public http and https addresses are allowed", () => {
  for (const ip of ["127.0.0.1", "10.2.3.4", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::a00:1"]) {
    assert.equal(preview.isBlockedAddress(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "104.16.0.1", "2606:4700::1111"]) assert.equal(preview.isBlockedAddress(ip), false, ip);

  assert.equal(preview.parseTarget("stripe.com").href, "https://stripe.com/");
  assert.equal(preview.parseTarget(" https://linear.app/pricing#plans ").href, "https://linear.app/pricing");
  const code = raw => { try { preview.parseTarget(raw); return "ok"; } catch (e) { return e.code; } };
  for (const raw of ["http://localhost:3000", "http://127.0.0.1", "http://0x7f.1/", "http://2130706433/", "https://[::1]/", "intranet", "printer.local", "http://169.254.169.254/latest"]) assert.equal(code(raw), "blocked", raw);
  for (const raw of ["ftp://example.com", "https://user:pw@example.com", "https://example.com:8443", "javascript:alert(1)//x.com"]) assert.equal(code(raw), "bad_url", raw);
  assert.equal(code(""), "empty");
});

test("the DNS guard refuses names that resolve to private addresses", async () => {
  const err = await new Promise(r => preview.safeLookup("localhost", { all: true }, e => r(e)));
  assert.equal(err && err.code, "blocked");
});

test("pages are rewritten to load assets from the site and run the font script", () => {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><base href="/docs/">
<meta http-equiv="Content-Security-Policy" content="script-src 'self'"><meta http-equiv="refresh" content="0;url=/elsewhere">
<link rel="stylesheet" href="app.css" integrity="sha384-abc" crossorigin="anonymous"><script src="/a.js" integrity='sha256-x' crossorigin defer></script>
<title>Docs</title></head><body><header>Nav</header><h1>Hi</h1></body></html>`;
  const out = preview.rewriteHtml(html, "https://example.com/start/page");
  assert.match(out, /^<!doctype html><html lang="en"><head><base href="https:\/\/example.com\/docs\/"><script>/);
  assert.equal((out.match(/<base\b/g) || []).length, 1);
  assert.doesNotMatch(out, /Content-Security-Policy|http-equiv="refresh"|integrity|crossorigin/i);
  assert.match(out, /<link rel="stylesheet" href="app.css">/);
  assert.match(out, /<script src="\/a.js" defer><\/script>/);
  assert.match(out, /<header>Nav<\/header><h1>Hi<\/h1>/);
  const injected = out.slice(out.indexOf("<script>") + 8, out.indexOf("</script>"));
  assert.match(injected, /"url":"https:\/\/example.com\/start\/page"/);
  assert.doesNotThrow(() => new Function(injected));

  const bare = preview.rewriteHtml("<!DOCTYPE html><p>Plain</p>", "https://example.com/");
  assert.match(bare, /^<!DOCTYPE html><base href="https:\/\/example.com\/"><script>/);
  const sneaky = preview.rewriteHtml("<html><head></head></html>", "https://example.com/</script><script>alert(1)</script>");
  assert.equal((sneaky.match(/<\/script>/g) || []).length, 1);
});

test("the proxy follows redirects, decompresses pages and sandboxes the result", async () => {
  const site = http.createServer((req, res) => {
    if (req.url === "/old") { res.writeHead(301, { Location: "/new" }); res.end(); return; }
    if (req.url === "/new") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Encoding": "gzip" });
      res.end(zlib.gzipSync("<!doctype html><html><head><title>Café</title></head><body><h1>Bread baked at dawn</h1></body></html>"));
      return;
    }
    if (req.url === "/menu.pdf") { res.writeHead(200, { "Content-Type": "application/pdf" }); res.end("%PDF-1.7"); return; }
    if (req.url === "/wall") { res.writeHead(403, { "Content-Type": "text/html", "cf-mitigated": "challenge" }); res.end("<title>Just a moment...</title>"); return; }
    if (req.url === "/loop") { res.writeHead(302, { Location: "/loop" }); res.end(); return; }
    res.writeHead(404); res.end();
  });
  const origin = await listen(site);
  const testProxy = http.createServer(preview.createHandler({ allowLocal: true }));
  const realProxy = http.createServer(preview.handler);
  const tp = await listen(testProxy), rp = await listen(realProxy);
  const get = (base, target, headers = {}) => fetch(`${base}/api/preview?url=${encodeURIComponent(target)}`, { headers, redirect: "manual" });
  try {
    let r = await get(tp, origin + "/old");
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /text\/html/);
    assert.match(r.headers.get("content-security-policy"), /sandbox allow-scripts; frame-ancestors 'self'/);
    assert.equal(r.headers.get("referrer-policy"), "no-referrer");
    let body = await r.text();
    assert.match(body, new RegExp(`<base href="${origin}/new">`));
    assert.match(body, /<h1>Bread baked at dawn<\/h1>/);
    assert.match(body, /<title>Café<\/title>/);

    r = await get(tp, origin + "/menu.pdf");
    assert.equal(r.headers.get("x-preview-error"), "not_html");
    assert.match(await r.text(), /isn't a web page/);

    r = await get(tp, origin + "/wall");
    assert.equal(r.headers.get("x-preview-error"), "challenge");
    r = await get(tp, origin + "/loop");
    assert.equal(r.headers.get("x-preview-error"), "redirects");
    r = await get(tp, "https://nothing.invalid/");
    assert.equal(r.headers.get("x-preview-error"), "not_found");
    assert.equal(r.headers.get("cache-control"), "no-store");

    r = await get(rp, origin + "/old");
    assert.equal(r.status, 403);
    assert.equal(r.headers.get("x-preview-error"), "blocked");
    body = await r.text();
    assert.match(body, /Only public websites/);
    assert.match(body, /type:"error"/);

    r = await get(rp, "https://example.com/pricing", { "Sec-Fetch-Dest": "document" });
    assert.equal(r.status, 302);
    assert.equal(r.headers.get("location"), "/app#site=url&url=https%3A%2F%2Fexample.com%2Fpricing");

    r = await fetch(`${rp}/api/preview?url=x.com`, { method: "POST" });
    assert.equal(r.status, 405);
  } finally {
    await Promise.all([close(site), close(testProxy), close(realProxy)]);
  }
});

test("private addresses are refused before any request is made", async () => {
  for (const raw of ["http://10.0.0.5/", "http://[::1]/", "http://169.254.169.254/latest/meta-data"]) {
    await assert.rejects(preview.fetchPage(raw), e => e.code === "blocked", raw);
  }
});

function framePage(html, url = "https://example.com/start", { fetch } = {}) {
  const sent = [];
  const dom = new JSDOM(preview.rewriteHtml(html, url), {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "https://fontroom.test/api/preview?url=" + encodeURIComponent(url),
    beforeParse(w) {
      if (fetch) w.fetch = fetch;
      w.postMessage = m => sent.push(m);
      w.Element.prototype.scrollIntoView = function () { sent.push({ type: "scrolled", id: this.id }); };
      w.scrollTo = () => sent.push({ type: "scrolled-top" });
    }
  });
  return { dom, w: dom.window, d: dom.window.document, sent };
}

test("inside the page, headings and body text take the picked fonts and links stay in the preview", async () => {
  const p = framePage(`<!doctype html><html><head><title>Acme</title></head><body>
<nav><a id="pricing" href="pricing">Pricing</a> <a id="faq" href="#faq">FAQ</a> <a id="ext" href="https://other.dev/x">Other</a> <a id="mail" href="mailto:a@b.co">Mail</a></nav>
<h1>Ship faster</h1><div id="big" style="font-size:44px">Big promo line</div><p id="para">Body copy</p>
<i class="fa fa-star"></i><code>npm i</code><section id="faq"><h2>Questions</h2></section></body></html>`);
  const { w, d, sent } = p;
  await new Promise(r => setTimeout(r, 30));
  assert.equal(sent[0].type, "ready");
  assert.equal(sent[0].fontroom, 1);
  assert.equal(sent[0].url, "https://example.com/start");
  assert.ok(sent.some(m => m.type === "ready" && m.title === "Acme"));

  assert.ok(d.querySelector("h1").hasAttribute("data-fr-h"));
  assert.ok(d.querySelector("h2").hasAttribute("data-fr-h"));
  assert.ok(d.querySelector("#big").hasAttribute("data-fr-h"), "large text counts as a heading");
  assert.ok(!d.querySelector("#para").hasAttribute("data-fr-h"));

  const msg = data => w.dispatchEvent(new w.MessageEvent("message", { data, source: w }));
  msg({ fontroom: 1, type: "fonts", heading: { family: "Fraunces", stack: '"Fraunces", serif', url: "https://fonts.googleapis.com/css2?family=Fraunces:wght@100..900&display=swap" }, body: { family: "Inter", stack: '"Inter", sans-serif}body{color:red' }, weight: 600 });
  const style = d.querySelector("style[data-fontroom]");
  assert.ok(style, "font style is added");
  assert.match(style.textContent, /--fr-h:"fr Fraunces", "Fraunces", serif;/);
  assert.match(style.textContent, /--fr-hw:600/);
  assert.doesNotMatch(style.textContent, /color:red\}|\}body\{color/, "font names can't break out of the rule");
  assert.match(style.textContent, /\[class\*=" fa-"\]/, "icon fonts are left alone");
  assert.equal(d.querySelectorAll('link[href^="https://fonts.googleapis.com/"]').length, 1);
  msg({ fontroom: 1, type: "fonts", heading: { family: "Fraunces", stack: '"Fraunces", serif' }, body: { family: "Lora", stack: '"Lora", serif', url: "https://evil.example/x.css" }, weight: 700 });
  assert.equal(d.querySelectorAll("link[rel=stylesheet]").length, 1, "only Google Fonts stylesheets are added");

  const before = d.querySelector("style[data-fontroom]").textContent;
  w.dispatchEvent(new w.MessageEvent("message", { data: { fontroom: 1, type: "fonts", heading: { stack: "x" }, body: { stack: "y" }, weight: 100 }, source: null }));
  assert.equal(d.querySelector("style[data-fontroom]").textContent, before, "messages from other windows are ignored");

  sent.length = 0;
  d.querySelector("#pricing").click();
  assert.deepEqual(sent.map(m => [m.type, m.url]), [["navigate", "https://example.com/pricing"]]);
  d.querySelector("#ext").click();
  assert.equal(sent.pop().url, "https://other.dev/x");
  d.querySelector("#faq").click();
  assert.deepEqual(sent.pop(), { type: "scrolled", id: "faq" });
  sent.length = 0;
  d.querySelector("#mail").click();
  assert.equal(sent.length, 0);
  w.close();
});

test("picked fonts get a private name so the site's own font of the same name can't win", async () => {
  const urls = [];
  const fetch = async url => {
    urls.push(url);
    if (url.includes("Broken")) return { ok: false, status: 400, text: async () => "" };
    return { ok: true, status: 200, text: async () => "@font-face{font-family:'Inter';font-weight:100 900;src:url(https://fonts.gstatic.com/x.woff2)}" };
  };
  const p = framePage(`<!doctype html><html><head><style>@font-face{font-family:"Inter";src:url(/fonts/inter.woff2)}</style></head><body><h1>Hi</h1><p>Text</p></body></html>`, undefined, { fetch });
  const { w, d } = p;
  await new Promise(r => setTimeout(r, 20));
  const msg = data => w.dispatchEvent(new w.MessageEvent("message", { data: { fontroom: 1, type: "fonts", weight: 700, ...data }, source: w }));
  msg({ heading: { family: "Broken Font", stack: '"Broken Font", serif', url: "https://fonts.googleapis.com/css2?family=Broken+Font" }, body: { family: "Inter", stack: '"Inter", sans-serif', url: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900" } });
  await new Promise(r => setTimeout(r, 20));
  assert.equal(urls.length, 2);
  const face = d.querySelector("style[data-fontroom-face]");
  assert.match(face.textContent, /font-family:'fr Inter'/);
  assert.doesNotMatch(face.textContent, /font-family:'Inter'/);
  assert.match(d.querySelector("style[data-fontroom]").textContent, /--fr-b:"fr Inter", "Inter", sans-serif/);
  assert.equal(d.querySelectorAll('link[href*="Broken+Font"]').length, 1, "a failed fetch falls back to a plain stylesheet link");
  msg({ heading: { family: "Broken Font", stack: '"Broken Font", serif', url: "https://fonts.googleapis.com/css2?family=Broken+Font" }, body: { family: "Inter", stack: '"Inter", sans-serif', url: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900" } });
  assert.equal(urls.length, 2, "each stylesheet is fetched once");
  w.close();
});

test("the font script survives the site removing it", async () => {
  const p = framePage("<!doctype html><html><head></head><body><h1>Hi</h1></body></html>");
  const { w, d } = p;
  await new Promise(r => setTimeout(r, 20));
  w.dispatchEvent(new w.MessageEvent("message", { data: { fontroom: 1, type: "fonts", heading: { stack: '"A", serif' }, body: { stack: '"B", serif' }, weight: 700 }, source: w }));
  d.querySelector("style[data-fontroom]").remove();
  d.body.append(d.createElement("div"));
  await new Promise(r => setTimeout(r, 320));
  assert.ok(d.querySelector("style[data-fontroom]"), "style is put back");
  w.close();
});
