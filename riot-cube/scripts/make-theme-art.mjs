import sharp from "sharp";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src =
  "C:/Users/PC/.cursor/projects/c-Users-PC-Projects-SHIFTR-riot-cube/assets";
const root = join(__dirname, "..");

const jobs = [
  {
    theme: "classic",
    bg: "riot-classic-bg.png",
    btn: "riot-classic-btn.png",
  },
  {
    theme: "grime",
    bg: "riot-grime-bg.png",
    btn: "riot-grime-btn.png",
  },
];

for (const job of jobs) {
  const dst = join(root, "public", "themes", job.theme);
  await mkdir(dst, { recursive: true });
  await sharp(join(src, job.bg))
    .resize(1024, 1365, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toFile(join(dst, "bg.jpg"));
  await sharp(join(src, job.btn))
    .resize(512, 512, { fit: "cover" })
    .jpeg({ quality: 82 })
    .toFile(join(dst, "btn.jpg"));
  console.log("ready", job.theme);
}
