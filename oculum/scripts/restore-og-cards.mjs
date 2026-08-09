import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join, basename } from "path";

const root = "C:/Users/PC/Projects/SHIFTR";
const out = "C:/Users/PC/Projects/SHIFTR/oculum/public/assets/cards_og";
const commit = "b87204a";

mkdirSync(out, { recursive: true });

const files = execSync(`git ls-tree -r --name-only ${commit} -- oculum/public/assets/cards`, {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split(/\r?\n/)
  .filter((f) => /\.(jpg|png)$/i.test(f));

let n = 0;
for (const f of files) {
  const buf = execSync(`git show ${commit}:${f}`, {
    cwd: root,
    maxBuffer: 20 * 1024 * 1024,
  });
  writeFileSync(join(out, basename(f)), buf);
  n++;
  if (n % 25 === 0) console.log("...", n);
}
console.log("restored", n, "files to", out);
