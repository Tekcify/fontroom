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
  assert.match($("#stage").style.getPropertyValue("--fh"), /Syne/);
  assert.match($("#codeOut").textContent, /Syne, Inter.*next\/font\/google/);
  opts[1].click();
  assert.match($("#stage").style.getPropertyValue("--fh"), /Fraunces/);
  assert.match($("#codeOut").textContent, /Fraunces/);
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
  assert.match(css, /\.cell\.span2 \.cell-text\{[^}]*justify-content:center/);
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
  assert.match($("#stage").style.getPropertyValue("--fh"), /Fraunces/);
  key(tabs[1], "End");
  assert.equal($("#stage").dataset.tpl, "mag");
  assert.equal($("#stage").getAttribute("aria-labelledby"), "tpl-mag");
  assert.ok($$("#siteBody .h").length >= 3, "headings in every template use the picked font");
  key(tabs[3], "ArrowRight");
  assert.equal($("#stage").dataset.tpl, "fin");
  assert.deepEqual(p.errors, []);
  p.w.close();
});

test("landing font list pins on scroll and steps through every font before letting go", async () => {
  const p = openPage("index.html", { media: q => q.includes("min-width") });
  await p.tick(50);
  const { $, $$, w } = p;
  const pin = $("#tryPin"), sec = $("#try");
  Object.defineProperty(sec, "offsetHeight", { value: 800 });
  Object.defineProperty(w, "innerHeight", { value: 900, configurable: true });
  let at = 0;
  pin.getBoundingClientRect = () => ({ top: at });
  const scrollTo = async y => { at = y; w.dispatchEvent(new w.Event("scroll")); await p.tick(40); };
  w.dispatchEvent(new w.Event("resize"));
  assert.ok(pin.classList.contains("is-pinned"));
  const top = parseInt(sec.style.top, 10);
  const run = parseInt(pin.style.height, 10) - 800;
  assert.ok(run > 0);
  const opts = $$(".font-opt");
  const checked = () => opts.findIndex(o => o.getAttribute("aria-checked") === "true");
  assert.equal(checked(), 0);
  await scrollTo(400);
  assert.equal(checked(), 0);
  for (let i = 0; i < opts.length; i++) {
    await scrollTo(top - run * (i + 0.5) / opts.length);
    assert.equal(checked(), i);
    assert.ok(Math.abs(parseFloat(pin.style.getPropertyValue("--rp")) - 0.5) < 0.01, "the active row fills as you scroll through it");
    assert.ok(Math.abs(parseFloat(pin.style.getPropertyValue("--tp")) - (i + 0.5) / opts.length) < 0.01);
  }
  assert.equal($$(".fonts .fonts-mark").length, 1);
  await scrollTo(top - run - 500);
  assert.equal(checked(), opts.length - 1);
  opts[2].click();
  await scrollTo(top - run - 520);
  assert.equal(checked(), 2, "a click is kept until the scroll reaches another font");
  Object.defineProperty(w, "innerHeight", { value: 700, configurable: true });
  w.dispatchEvent(new w.Event("resize"));
  assert.ok(!pin.classList.contains("is-pinned"), "no pin when the section is taller than the window");
  assert.equal(pin.style.height, "");
  assert.deepEqual(p.errors, []);
  p.w.close();
});

test("how it works steps use Nucleo glass icons in the brand colour", async () => {
  const p = openPage("index.html");
  await p.tick(50);
  const { $$, d } = p;
  const icons = $$(".steps .step-ic svg");
  assert.equal(icons.length, 3);
  assert.equal($$(".step-n").length, 0);
  icons.forEach(svg => {
    assert.ok(svg.querySelector("linearGradient"));
    assert.ok(svg.querySelector("feGaussianBlur"));
    svg.querySelectorAll("*").forEach(el => {
      ["fill", "mask", "filter", "clip-path"].forEach(a => {
        const v = el.getAttribute(a);
        if (v && v.startsWith("url(#")) assert.ok(d.getElementById(v.slice(5, -1)), `${v} resolves`);
      });
    });
  });
  const ids = $$("[id]").map(el => el.id);
  assert.equal(new Set(ids).size, ids.length, "no duplicate ids on the page");
  assert.match(read("css/home.css"), /\.step-ic\{[^}]*--nc-gradient-1-color-1:#ff7a52/);
  assert.equal($$('.foot nav[aria-label="Credits"]').length, 0);
  p.w.close();
});

test("bento font drop reads the file locally and rejects other files", async () => {
  const p = openPage("index.html");
  await p.tick(50);
  const { $, w } = p;
  const input = $("#dropInput");
  const pickFile = async file => {
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new w.Event("change"));
    await p.tick(30);
  };
  assert.ok($("#dropDone").hidden);
  await pickFile(new w.File(["hello"], "notes.txt"));
  assert.ok($("#dropDone").hidden);
  assert.match($("#toast").textContent, /isn't a font file/);
  await pickFile(new w.File([new Uint8Array(3000)], "BrandSans-Variable.woff2"));
  assert.ok(!$("#dropDone").hidden);
  assert.ok($("#drop").classList.contains("has"));
  assert.equal($("#dropName").textContent, "BrandSans-Variable.woff2");
  assert.equal($("#dropSize").textContent, "3 KB");
  assert.match($("#dropAa").style.fontFamily, /Dropped font 1/);
  const dt = { types: ["Files"], files: [new w.File([new Uint8Array(10)], "Display-Bold.otf")], dropEffect: "" };
  const fire = type => {
    const e = new w.Event(type, { bubbles: true, cancelable: true });
    e.dataTransfer = dt;
    $(".cell-drop").dispatchEvent(e);
    return e;
  };
  assert.ok(fire("dragenter").defaultPrevented);
  assert.ok($("#drop").classList.contains("over"));
  assert.ok(fire("drop").defaultPrevented);
  await p.tick(30);
  assert.ok(!$("#drop").classList.contains("over"));
  assert.equal($("#dropName").textContent, "Display-Bold.otf");
  assert.match($("#dropAa").style.fontFamily, /Dropped font 2/);
  assert.deepEqual(p.errors, []);
  p.w.close();
});

test("bento weight picker only selects weights the font has", async () => {
  const p = openPage("index.html");
  await p.tick(50);
  const { $, $$, key } = p;
  const radios = $$('#wt [role="radio"]');
  assert.deepEqual(radios.map(b => b.dataset.w), ["300", "400", "500", "600", "700"]);
  assert.equal($$("#wt .no").length, 2);
  radios[4].click();
  assert.equal($("#wtSpec").style.fontWeight, "700");
  assert.equal(radios[4].getAttribute("aria-checked"), "true");
  key(radios[4], "ArrowRight");
  assert.equal(radios[0].getAttribute("aria-checked"), "true");
  assert.equal(p.d.activeElement, radios[0]);
  $$("#wt .no")[0].click();
  assert.equal($("#wtNow").textContent, "No 800 in this font");
  assert.equal(radios[0].getAttribute("aria-checked"), "true", "a missing weight is never selected");
  assert.equal($("#wtSpec").style.fontWeight, "300");
  assert.match(read("index.html"), /family=Space\+Grotesk:wght@300\.\.700/);
  p.w.close();
});

test("bento share link follows the options and opens the same setup in the app", async () => {
  const p = openPage("index.html");
  await p.tick(50);
  const { $, w } = p;
  let copied = "";
  w.navigator.clipboard.writeText = async t => { copied = t; };
  const opt = k => $(`.share-opts [data-k="${k}"]`);
  assert.equal($("#shareUrl").getAttribute("href"), "app.html#h=Syne&b=Inter&w=700&accent=ff5a36&theme=dark");
  opt("h").click();
  await p.tick(250);
  opt("theme").click();
  opt("accent").click();
  const href = $("#shareUrl").getAttribute("href");
  assert.equal(href, "app.html#h=Fraunces&b=Inter&w=700&accent=3b5bdb&theme=light");
  assert.equal($("#share").dataset.theme, "light");
  assert.match($("#shareH").style.fontFamily, /Fraunces/);
  assert.equal(opt("h").textContent, "Fraunces");
  assert.equal($("#shareText").textContent, "fontroom.tekcify.com/app#h=Fraunces&b=Inter&w=700&accent=3b5bdb&theme=light");
  assert.ok($("#shareText .hot"));
  $("#shareCopy").click();
  await p.tick(10);
  assert.equal(copied, "https://fontroom.tekcify.com/app#h=Fraunces&b=Inter&w=700&accent=3b5bdb&theme=light");
  assert.equal($("#shareCopy").getAttribute("aria-label"), "Link copied");

  const app = openPage("app.html", { hash: "#" + href.split("#")[1] });
  await app.tick(150);
  assert.match(app.w.location.hash, /h=Fraunces/);
  assert.match(app.w.location.hash, /w=700/);
  assert.match(app.w.location.hash, /accent=3b5bdb/);
  assert.match(app.w.location.hash, /theme=light/);
  assert.deepEqual(app.errors, []);
  app.w.close();
  p.w.close();
});

test("bento flip stack moves with its buttons and the [ and ] keys", async () => {
  const p = openPage("index.html", { visible: true });
  await p.tick(50);
  const { $, $$, key } = p;
  const states = () => $$(".fl-slide").map(c => c.dataset.s).join(" ");
  const pressed = () => $$(".fl-tab").findIndex(b => b.getAttribute("aria-pressed") === "true");
  assert.equal(states(), "on after after after");
  assert.equal(pressed(), 0);
  assert.equal($$(".flip-ctrl, #flipPrev, #flipNext").length, 0, "no visible pager under the shortlist");
  assert.equal($("#flipCount").getAttribute("aria-live"), "off");
  key(p.d.body, "]");
  assert.equal($("#flipCount").textContent, "Syne and Inter, 2 of 4");
  assert.equal(states(), "before on after after");
  assert.equal(pressed(), 1);
  assert.equal($(".fl-strip").style.getPropertyValue("--i"), "1");
  assert.equal($(".fl-view").dataset.p, "1");
  assert.ok(!$$(".fl-slide")[1].classList.contains("snap"));
  assert.equal($("#flipCount").getAttribute("aria-live"), "polite");
  key(p.d.body, "[");
  assert.equal($("#flipCount").textContent, "Fraunces and Inter, 1 of 4");
  key(p.d.body, "[");
  assert.equal($("#flipCount").textContent, "Instrument Serif and Inter, 4 of 4");
  key(p.d.body, "]", { metaKey: true });
  assert.equal($("#flipCount").textContent, "Instrument Serif and Inter, 4 of 4", "shortcuts with modifiers are left alone");
  assert.equal(states(), "after after after on");
  $$(".fl-tab")[1].click();
  assert.equal($("#flipCount").textContent, "Syne and Inter, 2 of 4");
  assert.equal(states(), "after on after after", "jumping back brings the pairing in from above");
  $$(".fl-tab")[3].click();
  await p.tick(3000);
  assert.equal($("#flipCount").textContent, "Instrument Serif and Inter, 4 of 4", "autoplay stops once you take over");
  assert.deepEqual(p.errors, []);
  p.w.close();
});

test("landing page scrolls smoothly with a mouse or trackpad and natively otherwise", async () => {
  const mouse = openPage("index.html", { media: q => q.includes("pointer: fine") });
  await mouse.tick(50);
  assert.equal(typeof mouse.w.Lenis, "function");
  assert.ok(mouse.w.lenis, "Lenis runs for a fine pointer");
  assert.ok(mouse.d.documentElement.classList.contains("lenis"));
  assert.deepEqual(mouse.errors, []);
  mouse.w.close();
  const touch = openPage("index.html", { media: () => false });
  await touch.tick(50);
  assert.equal(touch.w.lenis, undefined, "touch keeps native scrolling");
  touch.w.close();
  const still = openPage("index.html", { media: q => q.includes("pointer: fine") || q.includes("reduce") });
  await still.tick(50);
  assert.equal(still.w.lenis, undefined, "reduced motion keeps native scrolling");
  still.w.close();
  assert.match(read("css/home.css"), /html\.lenis\{scroll-behavior:auto\}/);
});

test("nav star button shows the real GitHub star count and refreshes it on every visit", async () => {
  const live = openPage("index.html", { stars: 2 });
  await live.tick(50);
  const star = live.$("#ghStar");
  assert.equal(star.getAttribute("href"), "https://github.com/Tekcify/fontroom");
  assert.equal(live.$(".gh-star-label").textContent, "Star");
  assert.ok(!live.$("#ghStars").hidden);
  assert.equal(live.$("#ghStarsN").textContent, "2");
  assert.equal(star.getAttribute("aria-label"), "Star Fontroom on GitHub, 2 stars");
  assert.equal(JSON.parse(live.w.localStorage.getItem("fontroom.stars")).n, 2);
  assert.ok(live.fetchLog.includes("https://api.github.com/repos/Tekcify/fontroom"));
  live.w.close();

  const log = [];
  const cached = openPage("index.html", { fetchLog: log, stars: 9, storage: { "fontroom.stars": JSON.stringify({ n: 1234, t: Date.now() }) } });
  assert.equal(cached.$("#ghStarsN").textContent, "1.2k", "the saved count shows straight away");
  await cached.tick(50);
  assert.ok(log.some(u => u.includes("api.github.com")), "a saved count is still checked against GitHub");
  assert.equal(cached.$("#ghStarsN").textContent, "9");
  assert.equal(JSON.parse(cached.w.localStorage.getItem("fontroom.stars")).n, 9);
  cached.w.close();

  const offline = openPage("index.html", { storage: { "fontroom.stars": JSON.stringify({ n: 6, t: Date.now() - 864e5 }) } });
  await offline.tick(50);
  assert.equal(offline.$("#ghStarsN").textContent, "6", "a failed request keeps the last real count");
  offline.w.close();

  assert.match(read("css/home.css"), /\.gh-star-count\{[^}]*font-weight:700/);

  const big = openPage("index.html", { stars: 15400 });
  await big.tick(50);
  assert.equal(big.$("#ghStarsN").textContent, "15k");
  big.w.close();

  const down = openPage("index.html");
  await down.tick(50);
  assert.ok(down.$("#ghStars").hidden, "no count is shown when GitHub doesn't answer");
  assert.equal(down.$("#ghStar").getAttribute("aria-label"), "Star Fontroom on GitHub");
  assert.deepEqual(down.errors, []);
  down.w.close();
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
