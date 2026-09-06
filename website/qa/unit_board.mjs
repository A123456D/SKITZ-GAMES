/* Unit tests for gravity-drift-board.js (unminified source) */
const path = "file:///C:/Users/PC/Projects/SHIFTR/website/functions/_lib/gravity-drift-board.js";
import(path).then(m => {
  const t = (label, got, want) => {
    const pass = JSON.stringify(got) === JSON.stringify(want);
    console.log(`${pass ? "PASS" : "FAIL"} ${label}  got=${JSON.stringify(got)}${pass ? "" : " want=" + JSON.stringify(want)}`);
    return pass;
  };
  let fails = 0;
  const check = (label, got, want) => { if (!t(label, got, want)) fails++; };

  // sanitizeName
  check("lowercase upcased", m.sanitizeName("abc"), "ABC");
  check("xss stripped", m.sanitizeName('<script>alert(1)</script>'), "SCRIPTALERT1SCRI");
  check("emoji stripped", m.sanitizeName("player🎮x"), "PLAYERX");
  check("length cap 16", m.sanitizeName("ABCDEFGHIJKLMNOPQRSTUV").length, 16);
  check("trim + spaces kept", m.sanitizeName("  ab cd  "), "AB CD");
  check("null -> empty", m.sanitizeName(null), "");
  check("unicode name", m.sanitizeName("ÜmitÖztürk"), "MITZTRK");

  // isValidHandle
  check("2 chars invalid", m.isValidHandle("AB"), false);
  check("3 chars valid", m.isValidHandle("ABC"), true);
  check("only spaces invalid", m.isValidHandle("   "), false);

  // sanitizeRun boundaries
  check("score 0 rejected (noise)", m.sanitizeRun({score:0,level:1,lines:0,time:0,name:"ABC"}), null);
  check("score 8 (one piece) ok", m.sanitizeRun({score:8,level:1,lines:0,time:1,name:"ABC"})?.score, 8);
  check("score 99,999,999 ok", m.sanitizeRun({score:99999999,level:1,lines:0,time:0,name:"ABC"}), null);
  check("negative score rejected", m.sanitizeRun({score:-1,level:1,lines:0,time:0,name:"ABC"}), null);
  check("NaN score rejected", m.sanitizeRun({score:"abc",level:1,lines:0,time:0,name:"ABC"}), null);
  check("score 1.9 floored", m.sanitizeRun({score:1.9,level:1,lines:0,time:0,name:"ABC"}), null);
  check("level 0 rejected", m.sanitizeRun({score:1,level:0,lines:0,time:0,name:"ABC"}), null);
  check("level 999 ok", m.sanitizeRun({score:1,level:999,lines:0,time:0,name:"ABC"}), null);
  check("level 1000 rejected", m.sanitizeRun({score:1,level:1000,lines:0,time:0,name:"ABC"}), null);
  check("time 86401 rejected", m.sanitizeRun({score:1,level:1,lines:0,time:86401,name:"ABC"}), null);
  check("short name rejected", m.sanitizeRun({score:1,level:1,lines:0,time:0,name:"AB"}), null);
  check("float time kept as-is", typeof m.sanitizeRun({score:500,level:1,lines:0,time:12.7,name:"ABC"})?.time, "number");
  check("lines 100k rejected", m.sanitizeRun({score:1,level:1,lines:100000,time:0,name:"ABC"}), null);
  // new plausibility rules
  check("level/lines mismatch rejected", m.sanitizeRun({score:500,level:3,lines:4,time:30,name:"ABC"}), null);
  check("level/lines match ok", m.sanitizeRun({score:500,level:2,lines:4,time:30,name:"ABC"})?.score, 500);
  check("forged 99M/100s rejected by rate", m.sanitizeRun({score:99999999,level:999,lines:500,time:100,name:"CHEAT"}), null);
  check("honest strong run passes", m.sanitizeRun({score:17200,level:8,lines:30,time:9,name:"QABOT"})?.score, 17200);
  check("impossible line rate rejected", m.sanitizeRun({score:50000,level:5,lines:100,time:5,name:"CHEAT"}), null);

  // rankBoard tie-breaking
  const board = m.rankBoard([
    {name:"A",score:100,lines:5,at:100},
    {name:"B",score:200,lines:1,at:200},
    {name:"C",score:100,lines:9,at:50},
    {name:"D",score:100,lines:9,at:10},
  ]);
  check("order score desc then lines desc then at asc", board.map(r=>r.name), ["B","D","C","A"]);
  check("board capped at 100", m.rankBoard(Array.from({length:150},(_,i)=>({name:"X"+i,score:i,lines:0,at:i}))).length, 100);

  // rankOf
  const entries = [{name:"A",score:5,at:1},{name:"B",score:9,at:2}].sort((a,b)=>b.score-a.score);
  check("rankOf found", m.rankOf(entries, {name:"B",score:9,at:2}), 1);
  check("rankOf missing", m.rankOf(entries, {name:"Z",score:9,at:2}), null);

  console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILURES`);
  process.exit(0);
}).catch(e => { console.error("import error", e.message); process.exit(1); });
