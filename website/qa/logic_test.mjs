/* Headless logic test: ring clears, cascades, scoring, game over. */
import { Game, Aim } from "file:///C:/Users/PC/Projects/SHIFTR/website/games-src/gravity-drift/src/game.js";
import { SPOKES, RINGS } from "file:///C:/Users/PC/Projects/SHIFTR/website/games-src/gravity-drift/src/constants.js";

let seed = 12345;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const events = [];
const g = new Game(e => events.push(e.type === "clear" ? { ...e } : e.type), rng);
g.spawnOrDie();

// deterministic bag readout: always know next piece via queue
function fillRing(ring) {
  for (let s = 0; s < SPOKES; s++) g.occupied[ring][s] = true;
}
function countCells() {
  return g.occupied.flat().filter(Boolean).length;
}

// 1) direct collapse test: fill ring 2 (inner) -> should clear & collapse
fillRing(2);
g.occupied[5][0] = true; // cell above that must fall inward to ring 4
const before = countCells();
g.occupied[2].every(Boolean) && (g.lockPiece(), 0); // no active piece; call collapse directly
const cleared = g.collapseRings();
console.log("collapse cleared cells:", cleared.length, "(expect 10)");
console.log("ring2 now empty:", g.occupied[2].every(c => !c));
console.log("old ring5 cell moved to ring4:", g.occupied[4][0] === true);

// 2) scoring path: simulate real play with a gap-filling bot
seed = 999;
const g2 = new Game(e => {
  if (e.type === "clear") events.push({ clear: { rings: e.count, combo: e.combo, gained: e.gained } });
}, rng);
g2.spawnOrDie();
let drops = 0;
let t = 0;
while (g2.phase !== Aim.GAME_OVER && drops < 400) {
  const piece = g2.piece;
  // find ring nearest completion that is reachable: all spokes below gap are filled
  let placed = false;
  for (let ring = 0; ring < RINGS && !placed; ring++) {
    const filled = g2.occupied[ring].filter(Boolean).length;
    if (filled === SPOKES) continue;
    for (let s = 0; s < SPOKES && !placed; s++) {
      if (g2.occupied[ring][s]) continue;
      // gap at [ring, s]; piece must cover s. Check every piece cell spoke offset:
      for (let off = 0; off < 4 && !placed; off++) {
        if (!piece.cells.some(c => c[1] === off)) continue;
        // aim so that cell with spoke-offset `off` lands on s
        const target = ((s - off) % SPOKES + SPOKES) % SPOKES;
        // simulate: set aim, hard drop, see where it lands
        const save = { occ: g2.occupied.map(r => r.slice()), ring: piece.ring, spoke: piece.spoke, aim: g2.aimSpoke };
        g2.aimSpoke = target; piece.spoke = target;
        while (g2.stepDown(true)) {}
        const landRing = piece.ring;
        const covers = piece.cells.every(([dr, ds]) => g2.occupied[landRing + dr]?.[((piece.spoke + ds) % SPOKES + SPOKES) % SPOKES] === false);
        // restore
        g2.occupied = save.occ; piece.ring = save.ring; piece.spoke = save.spoke; g2.aimSpoke = save.aim;
        if (covers && landRing + Math.max(...piece.cells.map(c => c[0])) === ring) {
          g2.aimSpoke = target; piece.spoke = target;
          g2.hardDrop();
          placed = true; drops++;
        }
      }
    }
  }
  if (!placed) {
    // level: drop at spoke with lowest stack
    const heights = Array.from({length: SPOKES}, (_, s) => {
      for (let r = 0; r < RINGS; r++) if (g2.occupied[r][s]) return RINGS - r;
      return 0;
    });
    const minH = Math.min(...heights);
    const s = heights.indexOf(minH);
    const off = piece.cells[0][1];
    g2.aimSpoke = ((s - off) % SPOKES + SPOKES) % SPOKES;
    piece.spoke = g2.aimSpoke;
    g2.hardDrop();
    drops++;
  }
}
const clears = events.filter(e => e.clear);
console.log("\nbot: drops =", drops, "phase =", g2.phase, "score =", g2.score, "rings =", g2.lines);
console.log("clear events:", JSON.stringify(clears));
console.log("PASS =", g2.lines > 0 && g2.score > 0);
