import { readFileSync } from "fs";
import { buildCardFacePrompt, type ArtCard } from "./cardFacePrompt.mts";

const all = JSON.parse(readFileSync(new URL("./art-manifest.json", import.meta.url), "utf8")) as ArtCard[];
const heresy = process.argv[2];
const offset = Number(process.argv[3] ?? 0);
const limit = Number(process.argv[4] ?? 5);
const list = (heresy ? all.filter((c) => c.heresy === heresy) : all).slice(offset, offset + limit);
for (const c of list) {
  console.log(`ID:${c.id}`);
  console.log(buildCardFacePrompt(c));
  console.log("---");
}
