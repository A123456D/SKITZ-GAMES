import { rankBoard, rankOf, sanitizeRun } from "../../_lib/gravity-drift-board.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

const KEY = "gravity-drift-scores";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (!env.BOARD) {
    if (request.method === "GET") return json({ scores: [] });
    return json({ error: "board offline" }, 503);
  }
  const current = rankBoard((await env.BOARD.get(KEY, { type: "json" })) || []);
  if (request.method === "GET") return json({ scores: current });
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "bad json" }, 400);
    }
    const entry = sanitizeRun(body);
    if (!entry) return json({ error: "invalid score" }, 400);
    const scores = rankBoard([...current, entry]);
    await env.BOARD.put(KEY, JSON.stringify(scores));
    return json({ scores, rank: rankOf(scores, entry) });
  }
  return json({ error: "method" }, 405);
}
