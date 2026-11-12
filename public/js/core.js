const FONT_DATA = {
  sans: "Inter|Roboto|Open Sans|Lato|Montserrat|Poppins|Nunito|Nunito Sans|Raleway|Work Sans|DM Sans|Manrope|Plus Jakarta Sans|Outfit|Sora|Urbanist|Figtree|Onest|Lexend|Mulish|Rubik|Karla|Barlow|IBM Plex Sans|Source Sans 3|Noto Sans|Public Sans|Red Hat Display|Red Hat Text|Space Grotesk|Hanken Grotesk|Schibsted Grotesk|Bricolage Grotesque|Instrument Sans|Albert Sans|Archivo|Be Vietnam Pro|Epilogue|Syne|Familjen Grotesk|Golos Text|Atkinson Hyperlegible|Quicksand|Josefin Sans|Kumbh Sans|Jost|Heebo|Assistant|Cabin|Overpass|Fira Sans|Ubuntu|PT Sans|Geist|Inclusive Sans|Wix Madefor Display|Libre Franklin|Hind|Mukta|Titillium Web|Exo 2|Questrial|Encode Sans|Readex Pro|Gabarito",
  serif: "Playfair Display|Merriweather|Lora|Libre Baskerville|EB Garamond|Cormorant Garamond|Cormorant|DM Serif Display|DM Serif Text|Fraunces|Crimson Pro|Crimson Text|Source Serif 4|Noto Serif|PT Serif|Spectral|Newsreader|Literata|Bitter|Roboto Serif|Instrument Serif|Young Serif|Gloock|Bodoni Moda|Libre Bodoni|Libre Caslon Text|Alegreya|Cardo|Domine|Zilla Slab|Roboto Slab|Arvo|Prata|Gelasio|Petrona|Brygada 1918|Besley|Noticia Text|Vollkorn|Old Standard TT",
  display: "Bebas Neue|Anton|Oswald|Archivo Black|Abril Fatface|Righteous|Lobster|Alfa Slab One|Bungee|Unbounded|Climate Crisis|Rubik Mono One|Shrikhand|Monoton|Fredoka|Titan One|Chakra Petch|Orbitron|Audiowide|Krona One|Dela Gothic One|Bowlby One|Passion One|Fjalla One|Staatliches|Black Ops One|Syncopate|Paytone One|Lilita One|Bagel Fat One|Rammetto One|Rozha One",
  hand: "Dancing Script|Pacifico|Caveat|Great Vibes|Satisfy|Sacramento|Kalam|Shadows Into Light|Permanent Marker|Amatic SC|Indie Flower|Patrick Hand|Gochi Hand|Homemade Apple|Allura|Parisienne|Yellowtail|Kaushan Script|Courgette|Nothing You Could Do|Reenie Beanie|Caveat Brush|Architects Daughter|Cookie|Marck Script",
  mono: "JetBrains Mono|Fira Code|IBM Plex Mono|Space Mono|Roboto Mono|Source Code Pro|DM Mono|Geist Mono|Inconsolata|Ubuntu Mono|Martian Mono|Red Hat Mono|Azeret Mono|Courier Prime|Overpass Mono|Major Mono Display|Fira Mono|Anonymous Pro"
};
const CATS = [
  { id: "all", label: "All" },
  { id: "sans", label: "Sans serif" },
  { id: "serif", label: "Serif" },
  { id: "display", label: "Display" },
  { id: "hand", label: "Handwriting" },
  { id: "mono", label: "Monospace" }
];
const CAT_LABEL = { sans: "Sans serif", serif: "Serif", display: "Display", hand: "Handwriting", mono: "Monospace", custom: "Google Fonts", local: "Your file" };
const FALLBACK = { sans: "sans-serif", serif: "serif", display: "sans-serif", hand: "cursive", mono: "monospace", custom: "sans-serif", local: "sans-serif" };
const PAIRS = [
  ["Fraunces", "Inter"], ["Playfair Display", "Source Sans 3"], ["DM Serif Display", "DM Sans"], ["Bricolage Grotesque", "Inter"],
  ["Instrument Serif", "Instrument Sans"], ["Space Grotesk", "IBM Plex Sans"], ["Syne", "Manrope"], ["Cormorant Garamond", "Work Sans"],
  ["Unbounded", "Onest"], ["Young Serif", "Figtree"], ["Gloock", "Hanken Grotesk"], ["Newsreader", "Inter"], ["Lora", "Nunito Sans"],
  ["Archivo Black", "Archivo"], ["Libre Baskerville", "Karla"], ["EB Garamond", "Lato"], ["Bodoni Moda", "Jost"], ["Anton", "Rubik"],
  ["Merriweather", "Open Sans"], ["Oswald", "Source Serif 4"], ["Schibsted Grotesk", "Newsreader"], ["Epilogue", "Literata"],
  ["Bebas Neue", "Montserrat"], ["Caveat", "Nunito"], ["Plus Jakarta Sans", "Plus Jakarta Sans"], ["Sora", "Be Vietnam Pro"],
  ["Abril Fatface", "Poppins"], ["Gabarito", "Geist"], ["Prata", "Albert Sans"], ["JetBrains Mono", "Inter"]
];
const WEIGHT_NAMES = { 100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };
const WEIGHT_LABELS = { 100: "Thin", 200: "Extra light", 300: "Light", 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Extra bold", 900: "Black" };
const ALL_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const FONTS = [];
for (const [cat, s] of Object.entries(FONT_DATA)) for (const name of s.split("|")) FONTS.push({ name, cat });
const BY_NAME = new Map(FONTS.map(f => [f.name.toLowerCase(), f]));

const familyParam = n => encodeURIComponent(n).replace(/%20/g, "+");

function parseWeights(css) {
  const set = new Set();
  const ranges = [];
  const re = /font-weight:\s*(\d+)(?:\s+(\d+))?/g;
  let m;
  while ((m = re.exec(css))) {
    if (m[2]) ranges.push([+m[1], +m[2]]);
    else set.add(+m[1]);
  }
  const out = ALL_WEIGHTS.filter(w => set.has(w) || ranges.some(([a, b]) => w >= a && w <= b));
  return out.length ? out : [400];
}

function weightsFromQuery(q) {
  if (!q) return [400];
  const r = q.match(/(\d+)\.\.(\d+)/);
  if (r) return ALL_WEIGHTS.filter(w => w >= +r[1] && w <= +r[2]);
  return q.replace(/^:wght@/, "").split(";").map(Number);
}

function nearestWeight(list, pref) {
  if (!list || !list.length) return pref;
  return list.reduce((best, w) => {
    const d = Math.abs(w - pref), bd = Math.abs(best - pref);
    return d < bd || (d === bd && w > best) ? w : best;
  }, list[0]);
}

function bodyWeights(list) {
  const base = nearestWeight(list, 400);
  const strong = [600, 700, 500].find(w => list.includes(w) && w > base);
  return strong ? [base, strong] : [base];
}

function cssUrl(families) {
  const parts = families.map(({ name, weights }) => {
    const ws = [...new Set(weights)].sort((a, b) => a - b);
    return "family=" + familyParam(name) + (ws.length === 1 && ws[0] === 400 ? "" : ":wght@" + ws.join(";"));
  });
  return "https://fonts.googleapis.com/css2?" + parts.join("&") + "&display=swap";
}

function mergeFamilies(h, b) {
  if (h.name === b.name) return [{ name: h.name, weights: [...new Set([...h.weights, ...b.weights])].sort((x, y) => x - y) }];
  return [h, b];
}

function camelName(name) {
  return name.split(/\s+/).map((w, i) => {
    if (/^\d+$/.test(w)) return w;
    const lower = w.toLowerCase();
    return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join("");
}
const pascalName = name => name.replace(/\s+/g, "");
const kebabName = name => name.toLowerCase().replace(/\s+/g, "-");
const nextName = name => name.replace(/\s+/g, "_");

function buildCode({ heading, body, hWeight, hWeights, bWeights, hCat, bCat, bodyPx }) {
  const hw = [hWeight];
  const bw = bWeights;
  const hStack = `"${heading}", ${FALLBACK[hCat] || "sans-serif"}`;
  const bStack = `"${body}", ${FALLBACK[bCat] || "sans-serif"}`;
  const fams = mergeFamilies({ name: heading, weights: hw }, { name: body, weights: bw });
  const url = cssUrl(fams);
  const strong = bw[1];

  const html = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${url}" rel="stylesheet">`;
  const css = `:root {
  --font-heading: ${hStack};
  --font-body: ${bStack};
}

body {
  font-family: var(--font-body);
  font-size: ${bodyPx}px;
  font-weight: ${bw[0]};
}

h1, h2, h3, h4 {
  font-family: var(--font-heading);
  font-weight: ${hWeight};
}${strong ? `

strong, b {
  font-weight: ${strong};
}` : ""}`;

  const tailwind = `@import url("${url}");
@import "tailwindcss";

@theme {
  --font-heading: ${hStack};
  --font-body: ${bStack};
}`;
  const tailwindUse = `<h1 class="font-heading font-[${hWeight}]">Your headline</h1>
<p class="font-body">Your body copy</p>`;

  let nextImports, nextConsts, nextClass;
  if (heading === body) {
    const ws = fams[0].weights.map(String);
    nextImports = `import { ${nextName(heading)} } from "next/font/google";`;
    nextConsts = `const font = ${nextName(heading)}({
  subsets: ["latin"],
  weight: ${JSON.stringify(ws).replace(/,/g, ", ")},
  variable: "--font-body",
});`;
    nextClass = "font.variable";
  } else {
    nextImports = `import { ${nextName(heading)}, ${nextName(body)} } from "next/font/google";`;
    nextConsts = `const heading = ${nextName(heading)}({
  subsets: ["latin"],
  weight: ${JSON.stringify(hw.map(String))},
  variable: "--font-heading",
});

const body = ${nextName(body)}({
  subsets: ["latin"],
  weight: ${JSON.stringify(bw.map(String)).replace(/,/g, ", ")},
  variable: "--font-body",
});`;
    nextClass = "`${heading.variable} ${body.variable}`";
  }
  const next = `${nextImports}

${nextConsts}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={${nextClass}}>
      <body>{children}</body>
    </html>
  );
}`;
  const nextCss = `body {
  font-family: var(--font-body), ${FALLBACK[bCat] || "sans-serif"};
}

h1, h2, h3, h4 {
  font-family: var(${heading === body ? "--font-body" : "--font-heading"}), ${FALLBACK[hCat] || "sans-serif"};
  font-weight: ${hWeight};
}`;

  const hc = camelName(heading), bc = camelName(body);
  const flutter = `import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

ThemeData buildTheme() {
  final base = ThemeData(useMaterial3: true);
  final text = GoogleFonts.${bc}TextTheme(base.textTheme);
  final heading = GoogleFonts.${hc}(fontWeight: FontWeight.w${hWeight});

  return base.copyWith(
    textTheme: text.copyWith(
      displayLarge: text.displayLarge?.merge(heading),
      displayMedium: text.displayMedium?.merge(heading),
      headlineLarge: text.headlineLarge?.merge(heading),
      headlineMedium: text.headlineMedium?.merge(heading),
      titleLarge: text.titleLarge?.merge(heading),
    ),
  );
}`;

  const expoName = (n, w) => `${pascalName(n)}_${w}${WEIGHT_NAMES[w]}`;
  const hKey = expoName(heading, hWeight);
  const bKeys = bw.map(w => expoName(body, w));
  const pkgs = heading === body ? [kebabName(heading)] : [kebabName(heading), kebabName(body)];
  let expoImports;
  if (heading === body) {
    const keys = [...new Set([hKey, ...bKeys])];
    expoImports = `import { ${keys.join(", ")} } from "@expo-google-fonts/${kebabName(heading)}";`;
  } else {
    expoImports = `import { ${hKey} } from "@expo-google-fonts/${kebabName(heading)}";
import { ${bKeys.join(", ")} } from "@expo-google-fonts/${kebabName(body)}";`;
  }
  const allKeys = [...new Set([hKey, ...bKeys])];
  const expo = `import { useFonts } from "expo-font";
${expoImports}

export function useAppFonts() {
  const [loaded] = useFonts({ ${allKeys.join(", ")} });
  return loaded;
}

export const type = {
  heading: { fontFamily: "${hKey}" },
  body: { fontFamily: "${bKeys[0]}", fontSize: ${bodyPx - 1} },${bKeys[1] ? `
  bodyStrong: { fontFamily: "${bKeys[1]}", fontSize: ${bodyPx - 1} },` : ""}
};`;

  return {
    css: [{ label: "In your <head>", code: html }, { label: "In your CSS", code: css }],
    tailwind: [{ label: "app.css (Tailwind v4)", code: tailwind }, { label: "In your markup", code: tailwindUse }],
    next: [{ label: "app/layout.tsx", code: next }, { label: "app/globals.css", code: nextCss }],
    flutter: [{ label: "Terminal", code: "flutter pub add google_fonts" }, { label: "lib/theme.dart", code: flutter }],
    expo: [{ label: "Terminal", code: `npx expo install expo-font ${pkgs.map(p => "@expo-google-fonts/" + p).join(" ")}` }, { label: "fonts.ts", code: expo }]
  };
}

const FONT_FILE_EXT = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" };

function parseFontFile(buf) {
  const out = { format: null, variable: false, weight: null };
  if (!buf || buf.byteLength < 12) return out;
  const v = new DataView(buf);
  const len = buf.byteLength;
  const tag = o => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  const os2 = off => { if (off + 6 <= len) { const w = v.getUint16(off + 4); if (w >= 1 && w <= 1000) out.weight = w; } };
  const sig = tag(0);
  try {
    if (sig === "wOF2") {
      out.format = "woff2";
      const n = v.getUint16(12);
      let p = 48;
      const base128 = () => { let r = 0; for (let k = 0; k < 5; k++) { const b = v.getUint8(p++); r = r * 128 + (b & 127); if (!(b & 128)) break; } return r; };
      for (let i = 0; i < n && p < len; i++) {
        const flags = v.getUint8(p++);
        const idx = flags & 63;
        let t = null;
        if (idx === 63) { t = tag(p); p += 4; }
        if (idx === 47 || t === "fvar") out.variable = true;
        base128();
        const xf = (flags >> 6) & 3;
        if (idx === 10 || idx === 11 ? xf === 0 : xf !== 0) base128();
      }
    } else if (sig === "wOFF") {
      out.format = "woff";
      const n = v.getUint16(12);
      for (let i = 0; i < n; i++) {
        const e = 44 + i * 20;
        if (e + 20 > len) break;
        const t = tag(e);
        if (t === "fvar") out.variable = true;
        if (t === "OS/2" && v.getUint32(e + 8) === v.getUint32(e + 12)) os2(v.getUint32(e + 4));
      }
    } else if (sig === "OTTO" || sig === "true" || v.getUint32(0) === 0x00010000) {
      out.format = sig === "OTTO" ? "opentype" : "truetype";
      const n = v.getUint16(4);
      for (let i = 0; i < n; i++) {
        const e = 12 + i * 16;
        if (e + 16 > len) break;
        const t = tag(e);
        if (t === "fvar") out.variable = true;
        if (t === "OS/2") os2(v.getUint32(e + 8));
      }
    }
  } catch (e) {}
  return out;
}

function normalizeSiteUrl(raw) {
  let s = String(raw || "").trim();
  if (!s || s.length > 2048) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  let u;
  try { u = new URL(s); } catch (e) { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname.includes(".") && !u.hostname.startsWith("[")) return null;
  return u.href;
}

function familyFromFile(fileName) {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+(VF|Variable)$/i, "").replace(/\s+/g, " ").trim();
  return base || "My font";
}

function fontFaceCss(name, f, srcPath) {
  return `@font-face {
  font-family: "${name}";
  src: url("${srcPath}${f.file}") format("${f.format || "woff2"}");
  font-weight: ${f.variable ? "100 900" : f.weight || 400};
  font-style: normal;
  font-display: swap;
}`;
}

function buildLocalCode({ heading, body, hWeight, bWeights, hCat, bCat, bodyPx, hLocal, bLocal }) {
  const bw = bWeights, strong = bw[1];
  const hStack = `"${heading}", ${FALLBACK[hCat] || "sans-serif"}`;
  const bStack = `"${body}", ${FALLBACK[bCat] || "sans-serif"}`;
  const same = heading === body;
  const google = [];
  if (!hLocal) google.push({ name: heading, weights: [hWeight] });
  if (!bLocal) google.push({ name: body, weights: bw });
  const fams = google.length === 2 ? mergeFamilies(google[0], google[1]) : google;
  const faces = [];
  if (hLocal) faces.push(fontFaceCss(heading, hLocal, "/fonts/"));
  if (bLocal && !(hLocal && same)) faces.push(fontFaceCss(body, bLocal, "/fonts/"));
  const rules = `:root {
  --font-heading: ${hStack};
  --font-body: ${bStack};
}

body {
  font-family: var(--font-body);
  font-size: ${bodyPx}px;
  font-weight: ${bw[0]};
}

h1, h2, h3, h4 {
  font-family: var(--font-heading);
  font-weight: ${hWeight};
}${strong ? `

strong, b {
  font-weight: ${strong};
}` : ""}`;
  const files = [hLocal, bLocal].filter(Boolean).map(f => f.file);
  const css = [];
  if (fams.length) css.push({ label: "In your <head>", code: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${cssUrl(fams)}" rel="stylesheet">` });
  css.push({ label: `In your CSS (put ${[...new Set(files)].join(" and ")} in /fonts)`, code: faces.join("\n\n") + "\n\n" + rules });

  const localDecl = (f, v) => `localFont({
  src: "./fonts/${f.file}",
  weight: "${f.variable ? "100 900" : f.weight || 400}",
  variable: "${v}",
})`;
  const googleDecl = (n, ws, v) => `${nextName(n)}({
  subsets: ["latin"],
  weight: ${JSON.stringify(ws.map(String)).replace(/,/g, ", ")},
  variable: "${v}",
})`;
  const imports = ['import localFont from "next/font/local";'];
  const gNames = fams.map(f => nextName(f.name));
  if (gNames.length) imports.push(`import { ${gNames.join(", ")} } from "next/font/google";`);
  let consts, cls;
  if (same) {
    consts = `const font = ${localDecl(hLocal, "--font-body")};`;
    cls = "font.variable";
  } else {
    const hDecl = hLocal ? localDecl(hLocal, "--font-heading") : googleDecl(heading, [hWeight], "--font-heading");
    const bDecl = bLocal ? localDecl(bLocal, "--font-body") : googleDecl(body, bw, "--font-body");
    consts = `const heading = ${hDecl};\n\nconst body = ${bDecl};`;
    cls = "`${heading.variable} ${body.variable}`";
  }
  const next = `${imports.join("\n")}

${consts}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={${cls}}>
      <body>{children}</body>
    </html>
  );
}`;
  const nextCss = `body {
  font-family: var(--font-body), ${FALLBACK[bCat] || "sans-serif"};
}

h1, h2, h3, h4 {
  font-family: var(${same ? "--font-body" : "--font-heading"}), ${FALLBACK[hCat] || "sans-serif"};
  font-weight: ${hWeight};
}`;
  return {
    css,
    next: [{ label: "app/layout.tsx (put the file in app/fonts)", code: next }, { label: "app/globals.css", code: nextCss }]
  };
}
