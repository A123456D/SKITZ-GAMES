/**
 * Composite OCULUM match boards from lane plates + full arena bases.
 * Desktop 1536×1024 · Mobile 1024×1536
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.resolve(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-PC-Projects-SHIFTR-oculum/assets",
);
const outDir = path.join(root, "public/assets/ui");
const tmp = path.join(root, "tmp-board");

fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

function ff(args) {
  const r = spawnSync("ffmpeg", ["-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error(`ffmpeg failed: ${args.slice(-1)}`);
  }
}

const high = path.join(src, "board-lane-high.png");
const mid = path.join(src, "board-lane-mid.png");
const low = path.join(src, "board-lane-low.png");
const deskBase = path.join(src, "board-desktop-lanes-v1.png");
const mobBase = path.join(src, "board-mobile-lanes-v1.png");

// --- Desktop: hstack lanes, then blend with full arena ---
const deskLanes = path.join(tmp, "desk-lanes.png");
ff([
  "-i", high,
  "-i", mid,
  "-i", low,
  "-filter_complex",
  [
    "[0:v]scale=560:1024:force_original_aspect_ratio=increase,crop=512:1024[h]",
    "[1:v]scale=560:1024:force_original_aspect_ratio=increase,crop=512:1024[m]",
    "[2:v]scale=560:1024:force_original_aspect_ratio=increase,crop=512:1024[l]",
    "[h][m][l]hstack=inputs=3[stack]",
    // Soft vertical seams between lanes
    "[stack]gblur=sigma=0.6[soft]",
  ].join(";"),
  "-map", "[soft]",
  deskLanes,
]);

const deskOut = path.join(outDir, "bg-board-desktop.jpg");
ff([
  "-i", deskBase,
  "-i", deskLanes,
  "-filter_complex",
  [
    "[0:v]scale=1536:1024:force_original_aspect_ratio=increase,crop=1536:1024[base]",
    "[1:v]scale=1536:1024[lanes]",
    // Prefer arena structure, let lane plates tint each column
    "[base][lanes]blend=all_mode=overlay:all_opacity=0.42[mix]",
    // Darken slightly for HUD readability + soft vignette
    "[mix]eq=brightness=-0.04:saturation=1.05,vignette=PI/5[out]",
  ].join(";"),
  "-map", "[out]",
  "-q:v", "3",
  deskOut,
]);

// --- Mobile: scale lane stack into portrait, blend with mobile arena ---
const mobLanes = path.join(tmp, "mob-lanes.png");
ff([
  "-i", high,
  "-i", mid,
  "-i", low,
  "-filter_complex",
  [
    "[0:v]scale=380:1536:force_original_aspect_ratio=increase,crop=341:1536[h]",
    "[1:v]scale=380:1536:force_original_aspect_ratio=increase,crop=342:1536[m]",
    "[2:v]scale=380:1536:force_original_aspect_ratio=increase,crop=341:1536[l]",
    "[h][m][l]hstack=inputs=3,gblur=sigma=0.6[soft]",
  ].join(";"),
  "-map", "[soft]",
  mobLanes,
]);

const mobOut = path.join(outDir, "bg-board-mobile.jpg");
ff([
  "-i", mobBase,
  "-i", mobLanes,
  "-filter_complex",
  [
    "[0:v]scale=1024:1536:force_original_aspect_ratio=increase,crop=1024:1536[base]",
    "[1:v]scale=1024:1536[lanes]",
    "[base][lanes]blend=all_mode=overlay:all_opacity=0.4[mix]",
    "[mix]eq=brightness=-0.04:saturation=1.05,vignette=PI/5[out]",
  ].join(";"),
  "-map", "[out]",
  "-q:v", "3",
  mobOut,
]);

console.log("Wrote", deskOut, fs.statSync(deskOut).size);
console.log("Wrote", mobOut, fs.statSync(mobOut).size);
