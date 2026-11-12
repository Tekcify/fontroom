const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { openPage, read, PUBLIC } = require("./helpers");

test("landing page links into the tool and the primitives", async () => {
  const p = openPage("index.html");
  await p.tick(100);
  const hrefs = p.$$("a").map(a => a.getAttribute("href"));
  assert.ok(hrefs.includes("app.html"));
  assert.ok(hrefs.includes("primitives.html"));
  assert.ok(hrefs.includes("https://github.com/appdever01/fontroom"));
  assert.equal(p.$$("select").length, 0);
  assert.deepEqual(p.errors, []);
  p.w.close();
});

test("landing font picker drives the preview and the code", async () => {
  const p = openPage("index.html");
  await p.tick(50);
  const { $, $$, key } = p;
  const opts = $$(".font-opt");
  assert.equal(opts.length, 6);
  assert.equal(opts[0].getAttribute("aria-checked"), "true");
  assert.match($("#stage").style.getPropertyValue("--fh"), /Fraunces/);
  assert.match($("#codeOut").textContent, /Fraunces, Inter.*next\/font\/google/);
  opts[1].click();
  assert.match($("#stage").style.getPropertyValue("--fh"), /Syne/);
  assert.match($("#codeOut").textContent, /Syne/);
  key(opts[1], "ArrowDown");
  assert.equal(opts[2].getAttribute("aria-checked"), "true");
  assert.equal(p.d.activeElement, opts[2]);
  const stacks = $$("#stackTabs [role=tab]");
  assert.equal(stacks.length, 5);
  stacks[3].click();
  assert.equal(stacks[3].getAttribute("aria-selected"), "true");
  assert.match($("#codeOut").textContent, /GoogleFonts\.instrumentSerif/);
  key(stacks[3], "ArrowRight");
  assert.match($("#codeOut").textContent, /expo-font/);
  $("#copyBtn").click();
  await p.tick(20);
  assert.equal($("#copyBtn span").textContent, "Copied");
  assert.deepEqual(p.errors, []);
  p.w.close();
});

test("landing screenshot tabs switch the image", async () => {
  const p = openPage("index.html");
  await p.tick(20);
  const { $, $$, key } = p;
  const tabs = $$("#shotTabs [role=tab]");
  const imgs = $$("#shots img");
  tabs[1].click();
  assert.ok(imgs[1].classList.contains("is-on"));
  assert.ok(!imgs[0].classList.contains("is-on"));
  key(tabs[1], "End");
  assert.ok(imgs[2].classList.contains("is-on"));
  assert.equal($("#shots").getAttribute("aria-labelledby"), "tab-mag");
  p.w.close();
});

test("primitives page components work", async () => {
  const p = openPage("primitives.html");
  await p.tick(200);
  const { $, $$, key, d } = p;
  assert.equal($$(".swatch").length, 12);
  assert.match($("#swatchGrid").textContent, /--t4.*:1 on --bg/);
  $("#dd-btn").click(); assert.ok(!$("#dd-pop").hidden);
  key($("#dd-pop"), "ArrowDown"); key($("#dd-pop"), "Enter");
  assert.equal($("#ddDemo .dd-v").textContent, "800");
  $("#dd-btn").click(); key($("#dd-pop"), "ArrowDown"); key($("#dd-pop"), "Enter");
  assert.equal($("#ddDemo .dd-v").textContent, "400");
  $("#compare").click(); assert.ok(d.body.classList.contains("compare"));
  assert.equal($$("select").length, 0);
  assert.deepEqual(p.errors, []);
});

test("every local link and asset resolves", () => {
  const pages = ["index.html", "app.html", "primitives.html", "slop.html", "slop-app.html"];
  for (const page of pages) {
    const html = read(page);
    const refs = [...html.matchAll(/(?:href|src)="([^"#:]+?)(?:#[^"]*)?"/g)].map(m => m[1]).filter(r => r && !r.startsWith("//") && !r.includes("${"));
    for (const r of refs) {
      const target = path.join(PUBLIC, path.dirname(page), r);
      assert.ok(fs.existsSync(target), `${page} -> ${r}`);
    }
  }
});

test("slop pages carry the demo note", () => {
  for (const page of ["slop.html", "slop-app.html"]) assert.match(read(page), /deliberately bad/);
});

test("slop pages link to each other, not to the real tool", () => {
  assert.ok(read("slop.html").includes('href="slop-app.html"'));
  assert.ok(!read("slop.html").includes('href="app.html"'));
  assert.ok(read("slop-app.html").includes('href="slop.html"'));
});

test("landing page keeps phones from scrolling sideways", () => {
  const css = read("css/home.css");
  assert.match(css, /\.try\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.try-pick\{min-width:0\}/);
  const html = read("index.html");
  for (const label of ["SaaS", "Docs", "Magazine"]) assert.ok(html.includes(`<span class="s">${label}</span>`));
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
});
