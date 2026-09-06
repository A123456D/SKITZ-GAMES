/* Dev server: static files + REAL board API logic from gravity-drift-board.js */
import http from "http";
import fs from "fs";
import path from "path";
import { rankBoard, rankOf, sanitizeRun } from "file:///C:/Users/PC/Projects/SHIFTR/website/functions/_lib/gravity-drift-board.js";

const WEB = "C:/Users/PC/Projects/SHIFTR/website/public/games/gravity-drift/web";
const PORT = 8932;
let store = [];
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2", ".json": "application/json" };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (url.pathname === "/api/gravity-drift/scores") {
    if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json", ...CORS });
      return res.end(JSON.stringify({ scores: rankBoard(store) }));
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", () => {
        let entry = null;
        try { entry = sanitizeRun(JSON.parse(body)); } catch {}
        if (!entry) { res.writeHead(400, CORS); return res.end(JSON.stringify({ error: "invalid score" })); }
        store = rankBoard([...store, entry]);
        res.writeHead(200, { "Content-Type": "application/json", ...CORS });
        res.end(JSON.stringify({ scores: store, rank: rankOf(store, entry) }));
      });
      return;
    }
  }
  // static
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const p = path.join(WEB, rel);
  if (!p.replaceAll("\\", "/").startsWith(WEB.replaceAll("\\", "/"))) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end("nf"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
});
server.listen(PORT, () => console.log(`dev server on ${PORT}`));
