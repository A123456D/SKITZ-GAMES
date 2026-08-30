import {
  rankBoard,
  rankOf,
  sanitizeName,
  sanitizeProgress,
  sanitizeRun,
} from "./scores-shared.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    const json = (body, status = 200) =>
      Response.json(body, { status, headers: CORS });

    const url = new URL(req.url);
    const progressRoute = url.pathname.includes("progress");

    if (progressRoute) {
      const store = (await env.BOARD.get("progress", { type: "json" })) || {};
      if (req.method === "GET") {
        const handle = sanitizeName(url.searchParams.get("handle") || "");
        return json({ progress: store[handle] ?? null });
      }
      if (req.method === "POST") {
        let body;
        try {
          body = await req.json();
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

    const current = rankBoard((await env.BOARD.get("scores", { type: "json" })) || []);
    if (req.method === "GET") return json({ scores: current });
    if (req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: "bad json" }, 400);
      }
      const entry = sanitizeRun(body);
      if (!entry) return json({ error: "invalid score" }, 400);
      const scores = rankBoard([...current, entry]);
      await env.BOARD.put("scores", JSON.stringify(scores));
      return json({ scores, rank: rankOf(scores, entry) });
    }
    return json({ error: "method" }, 405);
  },
};
