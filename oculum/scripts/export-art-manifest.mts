import { writeFileSync } from "fs";
import { CARDS } from "../src/core/cards";
import { heresyShort } from "../src/core/heresies";

const rows = CARDS.map((c) => ({
  id: c.id,
  name: c.name,
  heresy: c.heresy,
  short: heresyShort(c.heresy),
  type: c.type,
  essence: c.essence,
  witnessCost: c.witnessCost,
  veiledPower: c.veiledPower,
  witnessedPower: c.witnessedPower,
  sightYield: c.sightYield,
  sovereign: !!c.sovereign,
  text: c.text,
  artSubject: c.artSubject,
}));

writeFileSync(new URL("./art-manifest.json", import.meta.url), JSON.stringify(rows, null, 2));
const by: Record<string, number> = {};
for (const r of rows) by[r.heresy] = (by[r.heresy] ?? 0) + 1;
console.log("count", rows.length);
console.log(by);
