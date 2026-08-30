import { sanitizeName, sanitizeProgress } from "../_lib/board.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (!env.BOARD) {
    if (request.method === "GET") return json({ progress: null });
    return json({ error: "board offline" }, 503);
  }
  const url = new URL(request.url);
  const store = (await env.BOARD.get("progress", { type: "json" })) || {};
  if (request.method === "GET") {
    const handle = sanitizeName(url.searchParams.get("handle") || "");
    return json({ progress: store[handle] ?? null });
  }
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "bad json" }, 400);
    }
    const snap = sanitizeProgress(body);
    if (!snap) return json({ error: "invalid progress" }, 400);
    store[snap.handle] = snap;
    await env.BOARD.put("progress", JSON.stringify(store));
    return json({ progress: snap });
  }
  return json({ error: "method" }, 405);
}
