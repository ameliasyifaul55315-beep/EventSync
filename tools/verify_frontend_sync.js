// Memastikan EventSync_Frontend (sumber) dan EventSync_Backend/EventSync/public (build Laravel)
// hanya berbeda pada hal yang disengaja. Jalankan dari folder root proyek:  node tools/verify_frontend_sync.js
const fs = require("fs"), path = require("path");
const SRC = "EventSync_Frontend/EventSync", PUB = "EventSync_Backend/EventSync/public";
const ONLY_SRC = new Set(["data", ".gitignore", "CHANGELOG.md", "README.md"]);
const ONLY_PUB = new Set([".htaccess", "index.php"]);
const walk = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name)).split(path.sep).join("/")]);
const strip = t => t.replace(/^\s*<script src="(?:\.{1,2}\/)*data\/[^"]+"><\/script>\r?\n/gm, "");
let bad = 0;
const src = walk(SRC).filter(f => !ONLY_SRC.has(f.split("/")[0])), pub = walk(PUB).filter(f => !ONLY_PUB.has(f));
for (const f of src) if (!pub.includes(f)) { console.log("HILANG di public:", f); bad++; }
for (const f of pub) if (!src.includes(f)) { console.log("EKSTRA di public:", f); bad++; }
for (const f of src.filter(f => pub.includes(f))) {
  if (f === "js/config.js") continue;
  const a = fs.readFileSync(path.join(SRC, f)), b = fs.readFileSync(path.join(PUB, f));
  const same = f.endsWith(".html") ? strip(a.toString()) === b.toString() : a.equals(b);
  if (!same) { console.log("BEDA:", f); bad++; }
}
const mode = d => (fs.readFileSync(path.join(d, "js/config.js"), "utf8").match(/API_MODE:\s*"(\w+)"/) || [])[1];
console.log(`Mode: sumber=${mode(SRC)} (harus local), public=${mode(PUB)} (harus remote)`);
if (mode(SRC) !== "local" || mode(PUB) !== "remote") bad++;
console.log(bad ? `GAGAL: ${bad} masalah` : "OK: kedua versi frontend konsisten");
process.exit(bad ? 1 : 0);
