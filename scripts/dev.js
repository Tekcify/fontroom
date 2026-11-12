"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { handler } = require("../lib/preview");

const PUBLIC = path.join(__dirname, "..", "public");
const PORT = +process.env.PORT || 4815;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8", ".json": "application/json"
};

function resolveFile(pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e) { return null; }
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(PUBLIC, path.normalize(rel));
  if (file !== PUBLIC && !file.startsWith(PUBLIC + path.sep)) return null;
  for (const f of [file, file + ".html"]) {
    try { if (fs.statSync(f).isFile()) return f; } catch (e) { /* try next */ }
  }
  return null;
}

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/api/preview") { handler(req, res); return; }
  const file = resolveFile(pathname);
  if (!file) { res.statusCode = 404; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.end("Not found"); return; }
  res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Fontroom running at http://localhost:${PORT}`));
