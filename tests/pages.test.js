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
  assert.deepEqual(p.errors, []);
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
