"""T13: smart gap-filling bot via __gd + keyboard -> force on-screen ring clears."""
import sys, time, json; sys.path.insert(0, "C:/Users/PC/AppData/Local/Temp/gd-qa")
import harness
harness.URL = "http://localhost:8933/index.html"
from harness import Game

SMART = """() => {
  const SPOKES = 10, RINGS = 12;
  const game = window.__gd();
  const piece = game.piece;
  if (!piece || game.phase !== 'aiming') return null;
  const occ = game.occupied;
  for (let ring = 0; ring < RINGS; ring++) {
    const filled = occ[ring].filter(Boolean).length;
    if (filled === SPOKES) continue;
    for (let s = 0; s < SPOKES; s++) {
      if (occ[ring][s]) continue;
      for (let off = 0; off < 4; off++) {
        if (!piece.cells.some(c => c[1] === off)) continue;
        const target = ((s - off) % SPOKES + SPOKES) % SPOKES;
        // simulate
        const saveOcc = occ.map(r => r.slice());
        const save = { ring: piece.ring, spoke: piece.spoke, aim: game.aimSpoke };
        game.aimSpoke = target; piece.spoke = target;
        while (game.stepDown(true)) {}
        const landRing = piece.ring;
        const covers = piece.cells.every(([dr, ds]) => {
          const rr = landRing + dr, ss = ((piece.spoke + ds) % SPOKES + SPOKES) % SPOKES;
          return rr < RINGS && occ[rr][ss] === false;
        });
        const bottomsAtRing = landRing + Math.max(...piece.cells.map(c => c[0])) === ring;
        // restore
        for (let r = 0; r < RINGS; r++) occ[r] = saveOcc[r];
        piece.ring = save.ring; piece.spoke = save.spoke; game.aimSpoke = save.aim;
        if (covers && bottomsAtRing) {
          return { aim: target, cur: ((game.aimSpoke % SPOKES) + SPOKES) % SPOKES };
        }
      }
    }
  }
  // fallback: lowest stack
  const heights = Array.from({length: SPOKES}, (_, s) => {
    for (let r = 0; r < RINGS; r++) if (occ[r][s]) return RINGS - r;
    return 0;
  });
  const s = heights.indexOf(Math.min(...heights));
  return { aim: ((s - piece.cells[0][1]) % SPOKES + SPOKES) % SPOKES,
           cur: ((game.aimSpoke % SPOKES) + SPOKES) % SPOKES };
}"""

g = Game(headed=True)
ok = g.relaunch_until_gpu(tries=8)
assert ok
g.page.fill("#pilot-name", "QABOT")
g.click("#play-btn"); g.page.wait_for_timeout(700)

t0 = time.time()
clear_shot = False
drops = 0
best = {"score": "000000", "lines": "0"}
while time.time() - t0 < 150:
    st = g.page.evaluate(SMART)
    if st is None:
        s = g.state()
        if s["overlayVisible"]:
            break
        g.page.wait_for_timeout(50)
        continue
    diff = (st["aim"] - st["cur"]) % 10
    if diff:
        g.press("d", n=diff, delay=14)
    g.press("s", n=1, delay=40)
    drops += 1
    g.page.wait_for_timeout(60)
    s = g.state()
    if s["lines"] != "0" and not clear_shot:
        g.shot("t13_clear_juice")
        clear_shot = True
        print(f"  >>> RING CLEAR t+{time.time()-t0:.0f}s score={s['score']} rings={s['lines']}")
        g.page.wait_for_timeout(350)
        g.shot("t13_clear_juice2")
    best = s
    if s["overlayVisible"]:
        break

print("A) smart bot:", json.dumps({k: best[k] for k in ("score","lines","level","time","overSummary")}), "drops:", drops)
if best["overlayVisible"]:
    g.shot("t13_gameover")
g.close()
print("DONE clear_shot:", clear_shot)
