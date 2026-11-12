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
  assert.ok(hrefs.includes("https://github.com/Tekcify/fontroom"));
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
  assert.match(css, /\.cell,\.cell\.span2\{grid-column:auto/);
  const html = read("index.html");
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
});

test("landing preview switches between four site templates and keeps the font", async () => {
  const p = openPage("index.html");
  await p.tick(50);
  const { $, $$, key } = p;
  const tabs = $$("#tplTabs [role=tab]");
  assert.deepEqual(tabs.map(t => t.textContent), ["Fintech", "Café", "Docs", "Magazine"]);
  assert.equal($("#stage").dataset.tpl, "fin");
  assert.match($("#siteBody").textContent, /Spend management/);
  $$(".font-opt")[1].click();
  tabs[1].click();
  assert.equal($("#stage").dataset.tpl, "cafe");
  assert.equal($("#tplDomain").textContent, "juniper.cafe");
  assert.match($("#siteBody").textContent, /Bread baked/);
  assert.match($("#phoneBody").textContent, /Your order/);
  assert.match($("#stage").style.getPropertyValue("--fh"), /Syne/);
  key(tabs[1], "End");
  assert.equal($("#stage").dataset.tpl, "mag");
  assert.equal($("#stage").getAttribute("aria-labelledby"), "tpl-mag");
  assert.ok($$("#siteBody .h").length >= 3, "headings in every template use the picked font");
  key(tabs[3], "ArrowRight");
  assert.equal($("#stage").dataset.tpl, "fin");
  assert.deepEqual(p.errors, []);
  p.w.close();
});

test("landing page story: problem, steps, questions and one call to action", async () => {
  const p = openPage("index.html");
  await p.tick(50);
  const { $, $$ } = p;
  const words = $$("#say .w");
  assert.ok(words.length > 30);
  assert.equal(words.map(w => w.textContent).join(" "), $("#say").textContent);
  assert.equal($$(".steps li").length, 3);
  assert.equal($$(".bento .cell").length, 4);
  const qa = $$(".qa details");
  assert.equal(qa.length, 8);
  assert.ok(qa[0].open);
  assert.ok(qa.slice(1).every(d => !d.open));
  const opens = $$("a").filter(a => a.getAttribute("href") === "app.html").map(a => a.textContent.trim());
  assert.ok(opens.length >= 3);
  assert.ok(opens.slice(0, -1).every(t => t === "Open Fontroom"), "one label for the open intent");
  assert.equal($$("[data-reveal]").length, $$("[data-reveal]").filter(el => el.classList.contains("in")).length + $$("[data-reveal]:not(.in)").length);
  assert.ok(!/—|–/.test($("main").textContent + $("footer").textContent + $(".hero-zone").textContent), "no em or en dashes in copy");
  assert.deepEqual(p.errors, []);
  p.w.close();
});
