// Minimal proxy server to keep your Serper.dev API key secret.
// Usage:
// SERPER_API_KEY=YOUR_KEY node server.js
// Then open http://localhost:8000/public/

import http from "node:http";
import { URL } from "node:url";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
const SERPER_API_KEY = process.env.SERPER_API_KEY || "";
const SERPER_ENDPOINT = "https://google.serper.dev/scholar";

function send(res, status, body, headers = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(text);
}

async function handleScholar(req, res, url) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
  if (!SERPER_API_KEY) return send(res, 500, { error: "Missing SERPER_API_KEY env var" });
  const q = url.searchParams.get("q") || "";
  const page = Number(url.searchParams.get("page") || "1");
  const num = Number(url.searchParams.get("num") || "10");
  try {
    const r = await fetch(SERPER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": SERPER_API_KEY,
      },
      body: JSON.stringify({ q, page, num }),
    });
    const data = await r.json();
    // Normalize shape to `{ results, meta: { next_cursor } }` similar to OpenAlex
    const items = Array.isArray(data.organic) ? data.organic : (Array.isArray(data.organic_results) ? data.organic_results : []);
    const total = typeof data.searchParameters?.num === "number" ? data.searchParameters.num * page : (items.length ? page * items.length : 0);
    const nextCursor = items.length > 0 ? String(page + 1) : null;
    send(res, 200, { results: items, meta: { count: total, next_cursor: nextCursor } });
  } catch (e) {
    send(res, 500, { error: String(e) });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  // CORS for local dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  if (url.pathname === "/api/scholar") {
    return handleScholar(req, res, url);
  }

  // Static file server for /public and /src
  try {
    // Simple static serving without deps
    const fsPath = new URL(`.${url.pathname === "/" ? "/public/index.html" : url.pathname}`, import.meta.url);
    const file = await import("node:fs/promises").then(fs => fs.readFile(fsPath));
    const ext = (url.pathname.split(".").pop() || "").toLowerCase();
    const type = ext === "html" ? "text/html" : ext === "js" ? "text/javascript" : ext === "css" ? "text/css" : "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(file);
  } catch {
    send(res, 404, { error: "Not found" });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


