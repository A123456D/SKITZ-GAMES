import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  rankBoard,
  rankOf,
  sanitizeName,
  sanitizeProgress,
  sanitizeRun,
} from "./scores-shared.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const SCORES_FILE = join(root, ".scores.json");
const PROGRESS_FILE = join(root, ".progress.json");

function loadJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(file, data) {
  writeFileSync(file, JSON.stringify(data));
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(body));
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function attach(server) {
  server.middlewares.use(async (req, res, next) => {
    const url = new URL(req.url || "/", "http://local");
    const path = url.pathname;
    if (path !== "/api/scores" && path !== "/api/progress") return next();
    cors(res);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (path === "/api/scores") {
      if (req.method === "GET") {
        send(res, 200, { scores: rankBoard(loadJson(SCORES_FILE, [])) });
        return;
      }
      if (req.method === "POST") {
        try {
          const entry = sanitizeRun(await readBody(req));
          if (!entry) {
            send(res, 400, { error: "invalid score" });
            return;
          }
          const scores = rankBoard([...loadJson(SCORES_FILE, []), entry]);
          saveJson(SCORES_FILE, scores);
          send(res, 200, { scores, rank: rankOf(scores, entry) });
        } catch {
          send(res, 400, { error: "bad json" });
        }
        return;
      }
      send(res, 405, { error: "method" });
      return;
    }

    const store = loadJson(PROGRESS_FILE, {});
    if (req.method === "GET") {
      const handle = sanitizeName(url.searchParams.get("handle") || "");
      send(res, 200, { progress: store[handle] ?? null });
      return;
    }
    if (req.method === "POST") {
      try {
        const snap = sanitizeProgress(await readBody(req));
        if (!snap) {
          send(res, 400, { error: "invalid progress" });
          return;
        }
        store[snap.handle] = snap;
        saveJson(PROGRESS_FILE, store);
        send(res, 200, { progress: snap });
      } catch {
        send(res, 400, { error: "bad json" });
      }
      return;
    }
    send(res, 405, { error: "method" });
  });
}

export function scoresApi() {
  return {
    name: "breach-riot-scores-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
