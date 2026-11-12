const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const PUBLIC = path.join(__dirname, "..", "public");
const read = rel => fs.readFileSync(path.join(PUBLIC, rel), "utf8");

function inlineScripts(html) {
  return html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>${read(src)}</script>`);
}

function loadCore() {
  return new Function(`${read("js/core.js")}
return { FONTS, BY_NAME, PAIRS, CATS, CAT_LABEL, FALLBACK, parseWeights, weightsFromQuery, nearestWeight, bodyWeights, cssUrl, camelName, buildCode, buildLocalCode, parseFontFile, familyFromFile, FONT_FILE_EXT };`)();
}

function fakeGoogleFetch(log) {
  return async url => {
    log.push(url);
    const fam = decodeURIComponent((url.match(/family=([^:&]+)/) || [])[1] || "").replace(/\+/g, " ");
    if (/^nope font$/i.test(fam)) return { ok: false, status: 400, text: async () => "" };
    if (fam === "Instrument Serif" && url.includes(":wght")) return { ok: false, status: 400, text: async () => "" };
    const weight = url.includes("100..900") ? "100 900" : "400";
    return { ok: true, status: 200, text: async () => `@font-face{font-family:'${fam}';font-weight:${weight};src:url(x.woff2)}` };
  };
}

function openPage(rel, { hash = "", fetchLog = [], storage } = {}) {
  const html = inlineScripts(read(rel));
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: `https://fontroom.test/${rel}${hash}`,
    beforeParse(w) {
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.Element.prototype.scrollIntoView = function () {};
      w.fetch = fakeGoogleFetch(fetchLog);
      w.navigator.clipboard = { writeText: async () => {} };
      w.FontFace = class { constructor(family, data, desc) { this.family = family; this.desc = desc; } load() { return Promise.resolve(this); } };
      Object.defineProperty(w.document, "fonts", { value: { add() {}, delete() {} } });
      if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
      w.addEventListener("error", e => errors.push(e.message));
    }
  });
  const w = dom.window;
  const d = w.document;
  return {
    dom, w, d, errors, fetchLog,
    $: s => d.querySelector(s),
    $$: s => [...d.querySelectorAll(s)],
    key: (el, k, extra = {}) => el.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...extra })),
    type(el, value) { el.value = value; el.dispatchEvent(new w.Event("input", { bubbles: true })); },
    tick: (ms = 150) => new Promise(r => setTimeout(r, ms))
  };
}

module.exports = { PUBLIC, read, loadCore, openPage };
