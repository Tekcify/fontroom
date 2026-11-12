"use strict";

const http = require("node:http");
const https = require("node:https");
const dns = require("node:dns");
const net = require("node:net");
const zlib = require("node:zlib");

const MAX_BYTES = 6 * 1024 * 1024;
const TIMEOUT_MS = 12000;
const MAX_REDIRECTS = 5;
const AGENTS = {
  desktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  mobile: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1"
};

class PreviewError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const blocked = new net.BlockList();
[["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]]
  .forEach(([a, p]) => blocked.addSubnet(a, p, "ipv4"));
[["::", 127], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8], ["2001:db8::", 32], ["100::", 64]]
  .forEach(([a, p]) => blocked.addSubnet(a, p, "ipv6"));

function isBlockedAddress(ip) {
  const addr = String(ip).replace(/^\[|\]$/g, "").toLowerCase();
  const v = net.isIP(addr);
  if (v === 4) return blocked.check(addr, "ipv4");
  if (v !== 6) return true;
  const dotted = addr.match(/^(?:::ffff:(?:0:)?|::|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return isBlockedAddress(dotted[1]);
  const hex = addr.match(/^(?:::ffff:(?:0:)?|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const a = parseInt(hex[1], 16), b = parseInt(hex[2], 16);
    return isBlockedAddress(`${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`);
  }
  return blocked.check(addr, "ipv6");
}

const LOCAL_NAME = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|home\.arpa)$/;

function parseTarget(raw, { allowLocal = false } = {}) {
  let s = String(raw || "").trim();
  if (!s) throw new PreviewError("empty", "Paste a link to a website to preview it.");
  if (s.length > 2048) throw new PreviewError("bad_url", "That link is too long to preview.");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  let u;
  try { u = new URL(s); } catch (e) { throw new PreviewError("bad_url", "That doesn't look like a web address. Try something like stripe.com."); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new PreviewError("bad_url", "Only http and https links can be previewed.");
  if (u.username || u.password) throw new PreviewError("bad_url", "Links with a username or password can't be previewed.");
  const host = u.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  const isPrivate = net.isIP(host) ? isBlockedAddress(host) : (!host.includes(".") || LOCAL_NAME.test(host));
  if (isPrivate && !allowLocal) throw new PreviewError("blocked", "Only public websites can be previewed. Local and private addresses aren't allowed.", 403);
  if (u.port && u.port !== "80" && u.port !== "443" && !allowLocal) throw new PreviewError("bad_url", "Links with a custom port can't be previewed.");
  u.hash = "";
  return u;
}

function safeLookup(hostname, options, cb) {
  if (typeof options === "function") { cb = options; options = {}; }
  const opts = typeof options === "number" ? { family: options } : (options || {});
  dns.lookup(hostname, { all: true, family: opts.family || 0, hints: opts.hints }, (err, addrs) => {
    if (err) return cb(err);
    if (!addrs.length || addrs.some(a => isBlockedAddress(a.address))) {
      return cb(new PreviewError("blocked", "Only public websites can be previewed. Local and private addresses aren't allowed.", 403));
    }
    if (opts.all) return cb(null, addrs);
    cb(null, addrs[0].address, addrs[0].family);
  });
}

const isHtmlType = t => !t || /^\s*(text\/html|application\/xhtml\+xml)\b/i.test(t);

function requestOnce(u, { mobile, allowLocal, signal }) {
  return new Promise((resolve, reject) => {
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(u, {
      method: "GET",
      headers: {
        "user-agent": mobile ? AGENTS.mobile : AGENTS.desktop,
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        "accept-language": "en-US,en;q=0.9",
        "accept-encoding": "gzip, deflate, br"
      },
      lookup: allowLocal ? undefined : safeLookup,
      signal
    }, res => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        resolve({ status, headers: res.headers, redirect: res.headers.location });
        return;
      }
      if (!isHtmlType(res.headers["content-type"])) {
        res.destroy();
        reject(new PreviewError("not_html", "That link isn't a web page. Paste the address of a page, not a file.", 415));
        return;
      }
      const declared = +res.headers["content-length"];
      if (declared > MAX_BYTES) {
        res.destroy();
        reject(new PreviewError("too_big", "That page is too large to preview.", 413));
        return;
      }
      const chunks = [];
      let size = 0;
      res.on("data", c => {
        size += c.length;
        if (size > MAX_BYTES) { req.destroy(new PreviewError("too_big", "That page is too large to preview.", 413)); return; }
        chunks.push(c);
      });
      res.on("end", () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

function decompress(buf, encoding) {
  const enc = String(encoding || "").trim().toLowerCase();
  const o = { maxOutputLength: MAX_BYTES };
  try {
    if (enc === "gzip" || enc === "x-gzip") return zlib.gunzipSync(buf, o);
    if (enc === "br") return zlib.brotliDecompressSync(buf, o);
    if (enc === "deflate") { try { return zlib.inflateSync(buf, o); } catch (e) { return zlib.inflateRawSync(buf, o); } }
  } catch (e) {
    if (e instanceof RangeError || e.code === "ERR_BUFFER_TOO_LARGE") throw new PreviewError("too_big", "That page is too large to preview.", 413);
    throw new PreviewError("failed", "That page came back damaged. Try again in a moment.", 502);
  }
  return buf;
}

function decodeBody(buf, contentType) {
  let label = (String(contentType || "").match(/charset\s*=\s*["']?([\w.:-]+)/i) || [])[1];
  if (!label) {
    const head = buf.subarray(0, 4096).toString("latin1");
    label = (head.match(/<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i) || [])[1];
  }
  try { return new TextDecoder(label || "utf-8").decode(buf); } catch (e) { return new TextDecoder("utf-8").decode(buf); }
}

function friendlyNetworkError(e, host, timedOut) {
  if (e instanceof PreviewError) return e;
  if (timedOut || e.name === "AbortError") return new PreviewError("timeout", `${host} took too long to respond. Try again, or try another page.`, 504);
  if (e.code === "ENOTFOUND" || e.code === "EAI_AGAIN" || e.code === "ENODATA") return new PreviewError("not_found", `We couldn't find ${host}. Check the spelling of the address.`, 502);
  if (/CERT|SSL|TLS/i.test(e.code || "")) return new PreviewError("tls", `${host} has a security certificate problem, so it can't be previewed.`, 502);
  return new PreviewError("unreachable", `We couldn't connect to ${host}. Check the address and try again.`, 502);
}

const isChallenge = (r, html) =>
  r.headers["cf-mitigated"] === "challenge" ||
  r.headers["x-vercel-mitigated"] === "challenge" ||
  (r.status >= 400 && /<title>\s*(Just a moment|Attention Required|Access denied)/i.test(html));

async function fetchPage(raw, { mobile = false, allowLocal = false, timeout = TIMEOUT_MS } = {}) {
  let u = parseTarget(raw, { allowLocal });
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeout);
  try {
    for (let hop = 0; ; hop++) {
      let r;
      try { r = await requestOnce(u, { mobile, allowLocal, signal: ac.signal }); }
      catch (e) { throw friendlyNetworkError(e, u.hostname, ac.signal.aborted); }
      if (r.redirect) {
        if (hop >= MAX_REDIRECTS) throw new PreviewError("redirects", `${u.hostname} redirected too many times.`, 508);
        let next;
        try { next = new URL(r.redirect, u).href; } catch (e) { throw new PreviewError("failed", `${u.hostname} sent a broken redirect.`, 502); }
        u = parseTarget(next, { allowLocal });
        continue;
      }
      const html = decodeBody(decompress(r.body, r.headers["content-encoding"]), r.headers["content-type"]);
      if (isChallenge(r, html)) throw new PreviewError("challenge", `${u.hostname} blocks visits from other servers, so it can't be previewed here.`, 403);
      return { url: u.href, status: r.status, html };
    }
  } finally {
    clearTimeout(timer);
  }
}

function frameRuntime(cfg) {
  if (window.__fontroom) return;
  window.__fontroom = true;
  var parentWin = window.parent;
  var send = function (m) { m.fontroom = 1; try { parentWin.postMessage(m, "*"); } catch (e) {} };

  ["pushState", "replaceState"].forEach(function (k) {
    var orig = history[k];
    if (typeof orig !== "function") return;
    history[k] = function () { try { return orig.apply(history, arguments); } catch (e) { return undefined; } };
  });
  function memoryStorage() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; },
      clear: function () { data = {}; },
      key: function (i) { return Object.keys(data)[i] || null; },
      get length() { return Object.keys(data).length; }
    };
  }
  ["localStorage", "sessionStorage"].forEach(function (k) {
    try { void window[k].length; } catch (e) {
      try { Object.defineProperty(window, k, { value: memoryStorage(), configurable: true }); } catch (e2) {}
    }
  });
  try { void document.cookie; } catch (e) {
    try { Object.defineProperty(document, "cookie", { get: function () { return ""; }, set: function () {}, configurable: true }); } catch (e2) {}
  }

  var ICONS = 'i[class],span[class*="icon" i],[class*="material-icons"],[class*="material-symbols"],[class^="fa-"],[class*=" fa-"],[class^="fa "],[class="fa"],[class*="glyph" i],[data-icon]';
  var KEEP = ICONS + ",code,pre,kbd,samp,tt,var,code *,pre *,kbd *,samp *,svg,svg *,math,math *";
  var style = document.createElement("style");
  style.setAttribute("data-fontroom", "");
  var links = {};
  var faces = {};
  var root = function () { return document.head || document.documentElement; };
  var clean = function (s) { return String(s || "").replace(/[;{}<>\\]/g, ""); };

  function css(m) {
    var w = Math.max(100, Math.min(900, Math.round(+m.weight || 700)));
    return ":root{--fr-h:" + clean(m.heading.stack) + ";--fr-b:" + clean(m.body.stack) + ";--fr-hw:" + w + "}" +
      "html body,html body *:not(" + KEEP + ",[data-fr-h],[data-fr-h] *){font-family:var(--fr-b)!important}" +
      "html body [data-fr-h],html body [data-fr-h] *:not(" + KEEP + "){font-family:var(--fr-h)!important}" +
      "html body [data-fr-h]{font-weight:var(--fr-hw)!important}";
  }
  function ensure() {
    var r = root();
    if (!r) return;
    if (style.textContent && !style.isConnected) r.appendChild(style);
    for (var u in links) if (!links[u].isConnected) r.appendChild(links[u]);
  }
  function apply(m) {
    if (!m.heading || !m.body) return;
    [m.heading, m.body].forEach(function (f) {
      if (f.url && /^https:\/\/fonts\.googleapis\.com\//.test(f.url) && !links[f.url]) {
        var l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = f.url;
        links[f.url] = l;
      }
      if (f.file && f.file.data && !faces[f.family] && typeof FontFace === "function") {
        try {
          var face = new FontFace(f.family, f.file.data, { weight: String(f.file.weight || "400"), style: "normal", display: "swap" });
          faces[f.family] = face;
          document.fonts.add(face);
          face.load().catch(function () {});
        } catch (e) {}
      }
    });
    style.textContent = css(m);
    ensure();
  }

  var seen = new WeakSet();
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, SVG: 1, svg: 1, IFRAME: 1, CODE: 1, PRE: 1, BUTTON: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1 };
  function ownText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && /\S/.test(n.nodeValue)) return true;
    return false;
  }
  function mark(full) {
    var b = document.body;
    if (!b) return;
    if (full) seen = new WeakSet();
    var base = parseFloat(getComputedStyle(b).fontSize) || 16;
    var min = Math.max(20, base * 1.3);
    var all = b.getElementsByTagName("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (seen.has(el)) continue;
      seen.add(el);
      if (/^H[1-6]$/.test(el.tagName) || el.getAttribute("role") === "heading") { el.setAttribute("data-fr-h", ""); continue; }
      if (SKIP[el.tagName] || el.hasAttribute("data-fr-h") || !ownText(el)) continue;
      if (parseFloat(getComputedStyle(el).fontSize) >= min) el.setAttribute("data-fr-h", "");
    }
  }
  var pending = 0;
  function later() {
    if (pending) return;
    pending = setTimeout(function () { pending = 0; mark(false); ensure(); }, 250);
  }
  if (typeof MutationObserver === "function") new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", function () { mark(true); ensure(); send({ type: "ready", url: cfg.url, title: document.title }); });
  window.addEventListener("load", function () { mark(true); ensure(); });

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.fontroom !== 1) return;
    e.stopImmediatePropagation();
    if (e.source !== parentWin) return;
    if (d.type === "fonts") apply(d);
  }, true);

  window.addEventListener("click", function (e) {
    var t = e.target;
    var a = t && t.closest ? t.closest("a[href]") : null;
    if (!a || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey) {
      if (a) e.preventDefault();
      return;
    }
    var href = a.getAttribute("href") || "";
    if (/^\s*(javascript|mailto|tel|sms|data|blob):/i.test(href)) return;
    var u;
    try { u = new URL(a.href); } catch (err) { return; }
    e.preventDefault();
    if (u.protocol !== "http:" && u.protocol !== "https:") return;
    var here = new URL(cfg.url);
    if (u.origin === here.origin && u.pathname === here.pathname && u.search === here.search) {
      var id = "";
      try { id = decodeURIComponent(u.hash.slice(1)); } catch (err) { id = u.hash.slice(1); }
      var target = id && (document.getElementById(id) || document.getElementsByName(id)[0]);
      if (target) target.scrollIntoView();
      return;
    }
    e.stopImmediatePropagation();
    send({ type: "navigate", url: u.href });
  }, true);

  send({ type: "ready", url: cfg.url, title: "" });
}

const runtimeSource = cfg => `(${frameRuntime.toString()})(${JSON.stringify(cfg).replace(/</g, "\\u003c")});`;

const escAttr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const decodeEntities = s => String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function rewriteHtml(html, pageUrl) {
  let base = pageUrl;
  const bm = html.match(/<base\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/i);
  if (bm) {
    try { base = new URL(decodeEntities(bm[1] ?? bm[2] ?? bm[3]), pageUrl).href; } catch (e) { base = pageUrl; }
    if (!/^https?:/i.test(base)) base = pageUrl;
  }
  let out = html
    .replace(/<base\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?\s*(?:content-security-policy(?:-report-only)?|refresh|x-frame-options)\b[^>]*>/gi, "")
    .replace(/<(?:script|link)\b[^>]*>/gi, tag => tag.replace(/\s(?:integrity|crossorigin)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?(?=[\s/>])/gi, ""));
  const inject = `<base href="${escAttr(base)}"><script>${runtimeSource({ url: pageUrl })}</script>`;
  if (/<head\b[^>]*>/i.test(out)) return out.replace(/<head\b[^>]*>/i, m => m + inject);
  if (/<html\b[^>]*>/i.test(out)) return out.replace(/<html\b[^>]*>/i, m => m + inject);
  return out.replace(/^(\s*<!doctype[^>]*>)?/i, m => m + inject);
}

function errorPage(message) {
  const esc = String(message).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const json = JSON.stringify(String(message)).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview unavailable</title><style>html,body{height:100%;margin:0}body{display:grid;place-items:center;padding:24px;background:#f5f5f2;color:#4a4f59;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center}p{max-width:36ch;margin:0}</style></head><body><p>${esc}</p><script>try{parent.postMessage({fontroom:1,type:"error",message:${json}},"*")}catch(e){}</script></body></html>`;
}

function createHandler(options = {}) {
  return async function previewHandler(req, res) {
    const reqUrl = new URL(req.url || "/", "http://localhost");
    const raw = reqUrl.searchParams.get("url") || "";
    const mobile = reqUrl.searchParams.get("ua") === "mobile";
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, HEAD");
      res.end();
      return;
    }
    if (req.headers["sec-fetch-dest"] === "document") {
      res.statusCode = 302;
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Location", "/app#" + new URLSearchParams({ site: "url", url: raw }).toString());
      res.end();
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Security-Policy", "sandbox allow-scripts; frame-ancestors 'self'");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Vary", "Sec-Fetch-Dest");
    try {
      const page = await fetchPage(raw, { mobile, allowLocal: !!options.allowLocal, timeout: options.timeout });
      const html = rewriteHtml(page.html, page.url);
      res.statusCode = 200;
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
      res.end(req.method === "HEAD" ? undefined : html);
    } catch (e) {
      const pe = e instanceof PreviewError ? e : new PreviewError("failed", "This page couldn't be loaded. Try again in a moment.", 502);
      res.statusCode = pe.status;
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Preview-Error", pe.code);
      res.end(req.method === "HEAD" ? undefined : errorPage(pe.message));
    }
  };
}

module.exports = { handler: createHandler(), createHandler, fetchPage, parseTarget, isBlockedAddress, safeLookup, rewriteHtml, errorPage, frameRuntime, PreviewError, MAX_BYTES };
