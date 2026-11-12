const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { read, PUBLIC } = require("./helpers");

const SITE = "https://fontroom.vercel.app";
const doc = page => new JSDOM(read(page)).window.document;
const meta = (d, sel) => d.querySelector(sel)?.getAttribute("content");
const ldBlocks = d => [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
const clean = s => s.replace(/\s+/g, " ").trim();

test("indexable pages have a unique title, description and canonical", () => {
  const pages = { "index.html": "/", "app.html": "/app", "primitives.html": "/primitives" };
  const titles = new Set();
  for (const [page, route] of Object.entries(pages)) {
    const d = doc(page);
    const title = d.title;
    assert.ok(title.length >= 15 && title.length <= 65, `${page} title length ${title.length}`);
    assert.ok(!titles.has(title), `${page} title is unique`);
    titles.add(title);
    const desc = meta(d, 'meta[name="description"]');
    assert.ok(desc && desc.length >= 70 && desc.length <= 160, `${page} description length ${desc && desc.length}`);
    assert.equal(d.querySelector('link[rel="canonical"]').getAttribute("href"), SITE + route);
    assert.ok(!/noindex/.test(meta(d, 'meta[name="robots"]') || ""), `${page} is indexable`);
    assert.equal(d.querySelectorAll("h1").length, 1, `${page} has one h1`);
    assert.equal(d.documentElement.lang, "en");
  }
});

test("demo slop pages stay out of search results", () => {
  for (const page of ["slop.html", "slop-app.html"]) {
    assert.match(meta(doc(page), 'meta[name="robots"]'), /noindex/);
  }
});

test("landing structured data is valid JSON and covers the app, site and FAQ", () => {
  const d = doc("index.html");
  const blocks = ldBlocks(d);
  assert.equal(blocks.length, 1);
  const graph = blocks[0]["@graph"];
  const byType = t => graph.find(n => n["@type"] === t);
  for (const t of ["Organization", "WebSite", "WebPage", "WebApplication", "SoftwareSourceCode", "HowTo", "FAQPage"]) assert.ok(byType(t), t);
  const app = byType("WebApplication");
  assert.equal(app.offers.price, "0");
  assert.equal(app.url, SITE + "/app");
  const ids = new Set(graph.map(n => n["@id"]));
  const refs = JSON.stringify(graph).match(/"@id":"[^"]+"/g).map(r => r.slice(7, -1));
  for (const r of refs) assert.ok(ids.has(r), `dangling @id ${r}`);
});

test("FAQ schema matches the visible questions word for word", () => {
  const d = doc("index.html");
  const faq = ldBlocks(d)[0]["@graph"].find(n => n["@type"] === "FAQPage").mainEntity;
  const visible = [...d.querySelectorAll(".qa details")].map(el => ({
    q: clean(el.querySelector("summary").textContent),
    a: clean(el.querySelector("p").textContent)
  }));
  assert.equal(faq.length, visible.length);
  faq.forEach((item, i) => {
    assert.equal(item.name, visible[i].q);
    assert.equal(item.acceptedAnswer.text, visible[i].a);
  });
});

test("HowTo schema matches the visible steps", () => {
  const d = doc("index.html");
  const how = ldBlocks(d)[0]["@graph"].find(n => n["@type"] === "HowTo").step;
  const steps = [...d.querySelectorAll(".steps li")].map(li => [li.querySelector("h3").textContent, li.querySelector("p").textContent]);
  assert.deepEqual(how.map(s => [s.name, s.text]), steps);
});

test("app page structured data and social tags", () => {
  const d = doc("app.html");
  const [ld] = ldBlocks(d);
  assert.equal(ld["@type"], "WebPage");
  assert.equal(ld.breadcrumb.itemListElement.at(-1).item, SITE + "/app");
  assert.equal(meta(d, 'meta[property="og:url"]'), SITE + "/app");
  assert.ok(d.querySelector("h1.sr"));
});

test("robots.txt allows search and AI crawlers, blocks the proxy and lists the sitemap", () => {
  const robots = read("robots.txt");
  assert.match(robots, /User-agent: \*\nAllow: \/\nDisallow: \/api\//);
  for (const bot of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
    assert.match(robots, new RegExp(`User-agent: ${bot}\\nAllow: /\\nDisallow: /api/`), bot);
  }
  assert.match(robots, new RegExp(`Sitemap: ${SITE}/sitemap.xml`));
});

test("sitemap lists exactly the indexable pages and real images", () => {
  const xml = read("sitemap.xml");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const pages = locs.filter(u => !/\.(webp|png)$/.test(u));
  assert.deepEqual(pages, [SITE + "/", SITE + "/app", SITE + "/primitives"]);
  for (const img of locs.filter(u => /\.(webp|png)$/.test(u))) {
    assert.ok(fs.existsSync(path.join(PUBLIC, new URL(img).pathname)), img);
  }
  assert.ok(!xml.includes("slop"));
});

test("llms.txt and the web manifest are in place", () => {
  const llms = read("llms.txt");
  assert.match(llms, /^# Fontroom\n\n> /);
  assert.ok(llms.includes(SITE + "/app"));
  assert.ok(!/—|–/.test(llms), "no em or en dashes");
  const manifest = JSON.parse(read("site.webmanifest"));
  assert.equal(manifest.name, "Fontroom");
  for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(PUBLIC, icon.src)), icon.src);
});
