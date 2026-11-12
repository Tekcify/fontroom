const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadCore, PUBLIC } = require("./helpers");

const X = loadCore();
const buf = file => { const b = fs.readFileSync(file); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); };

function sfnt(tables) {
  const n = tables.length;
  let off = 12 + n * 16;
  const parts = tables.map(([tag, data]) => { const o = off; off += data.length; return { tag, data, o }; });
  const out = Buffer.alloc(off);
  out.writeUInt32BE(0x00010000, 0);
  out.writeUInt16BE(n, 4);
  parts.forEach((t, i) => {
    const e = 12 + i * 16;
    out.write(t.tag, e, "latin1");
    out.writeUInt32BE(t.o, e + 8);
    out.writeUInt32BE(t.data.length, e + 12);
    t.data.copy(out, t.o);
  });
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.length);
}
const os2 = w => { const b = Buffer.alloc(8); b.writeUInt16BE(w, 4); return b; };

test("font catalogue has unique names and valid pairings", () => {
  const names = X.FONTS.map(f => f.name);
  assert.equal(new Set(names.map(n => n.toLowerCase())).size, names.length);
  assert.ok(names.length >= 180);
  for (const [h, b] of X.PAIRS) {
    assert.ok(X.BY_NAME.has(h.toLowerCase()), h);
    assert.ok(X.BY_NAME.has(b.toLowerCase()), b);
  }
});

test("weights are read from Google Fonts CSS and queries", () => {
  assert.deepEqual([...X.parseWeights("font-weight: 100 900;")], [100, 200, 300, 400, 500, 600, 700, 800, 900]);
  assert.deepEqual([...X.parseWeights("font-weight: 400;\nfont-weight: 700;")], [400, 700]);
  assert.deepEqual([...X.parseWeights("font-weight: 200 800;")], [200, 300, 400, 500, 600, 700, 800]);
  assert.deepEqual([...X.weightsFromQuery(":wght@400;700")], [400, 700]);
  assert.equal(X.weightsFromQuery(":wght@100..900").length, 9);
});

test("nearest and body weights", () => {
  assert.equal(X.nearestWeight([400], 700), 400);
  assert.equal(X.nearestWeight([300, 500], 400), 500);
  assert.equal(X.nearestWeight(null, 700), 700);
  assert.deepEqual([...X.bodyWeights([400])], [400]);
  assert.deepEqual([...X.bodyWeights([100, 200, 300, 400, 500, 600, 700, 800, 900])], [400, 600]);
});

test("names for each platform", () => {
  assert.equal(X.camelName("IBM Plex Sans"), "ibmPlexSans");
  assert.equal(X.camelName("Source Sans 3"), "sourceSans3");
  assert.equal(X.camelName("Amatic SC"), "amaticSc");
  assert.equal(X.cssUrl([{ name: "Instrument Serif", weights: [400] }]), "https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap");
});

test("Google Fonts code covers every platform", () => {
  const c = X.buildCode({ heading: "Playfair Display", body: "Source Sans 3", hWeight: 700, bWeights: [400, 600], hCat: "serif", bCat: "sans", bodyPx: 16 });
  assert.match(c.css[0].code, /family=Playfair\+Display:wght@700&family=Source\+Sans\+3:wght@400;600&display=swap/);
  assert.match(c.next[0].code, /import \{ Playfair_Display, Source_Sans_3 \} from "next\/font\/google"/);
  assert.match(c.flutter[1].code, /GoogleFonts\.sourceSans3TextTheme/);
  assert.match(c.expo[0].code, /@expo-google-fonts\/playfair-display @expo-google-fonts\/source-sans-3/);
  const same = X.buildCode({ heading: "Inter", body: "Inter", hWeight: 700, bWeights: [400, 600], hCat: "sans", bCat: "sans", bodyPx: 16 });
  assert.ok(same.css[0].code.includes("family=Inter:wght@400;600;700&"));
  assert.ok(!same.next[0].code.includes("const body"));
});

test("font files: variable woff2 is detected", () => {
  const m = X.parseFontFile(buf(path.join(PUBLIC, "fonts/AspektaVF.woff2")));
  assert.deepEqual(m, { format: "woff2", variable: true, weight: null });
});

test("font files: static and variable TrueType", () => {
  assert.deepEqual(X.parseFontFile(sfnt([["OS/2", os2(700)]])), { format: "truetype", variable: false, weight: 700 });
  assert.deepEqual(X.parseFontFile(sfnt([["OS/2", os2(400)], ["fvar", Buffer.alloc(16)]])), { format: "truetype", variable: true, weight: 400 });
  assert.deepEqual(X.parseFontFile(new ArrayBuffer(4)), { format: null, variable: false, weight: null });
  assert.deepEqual(X.parseFontFile(Buffer.from("not a font at all, honestly").buffer), { format: null, variable: false, weight: null });
});

test("family names from file names", () => {
  assert.equal(X.familyFromFile("AspektaVF.woff2"), "Aspekta");
  assert.equal(X.familyFromFile("GeneralSans-Variable.ttf"), "General Sans");
  assert.equal(X.familyFromFile("my_brand-font.otf"), "my brand font");
  assert.equal(X.familyFromFile(".woff2"), "My font");
});

test("own font code self-hosts the file and keeps Google for the other slot", () => {
  const c = X.buildLocalCode({ heading: "Aspekta", body: "Inter", hWeight: 700, bWeights: [400, 600], hCat: "local", bCat: "sans", bodyPx: 16, hLocal: { file: "AspektaVF.woff2", variable: true, format: "woff2" }, bLocal: null });
  assert.deepEqual(Object.keys(c), ["css", "next"]);
  assert.match(c.css[0].code, /family=Inter:wght@400;600&display=swap/);
  assert.match(c.css[1].code, /src: url\("\/fonts\/AspektaVF\.woff2"\) format\("woff2"\);\n  font-weight: 100 900;/);
  assert.match(c.next[0].code, /import localFont from "next\/font\/local";\nimport \{ Inter \} from "next\/font\/google";/);
  const both = X.buildLocalCode({ heading: "Brand", body: "Brand", hWeight: 700, bWeights: [700], hCat: "local", bCat: "local", bodyPx: 16, hLocal: { file: "Brand-Bold.ttf", weight: 700, format: "truetype" }, bLocal: { file: "Brand-Bold.ttf", weight: 700, format: "truetype" } });
  assert.equal(both.css.length, 1);
  assert.equal((both.css[0].code.match(/@font-face/g) || []).length, 1);
  assert.match(both.next[0].code, /const font = localFont/);
  assert.ok(!both.next[0].code.includes("next/font/google"));
});
