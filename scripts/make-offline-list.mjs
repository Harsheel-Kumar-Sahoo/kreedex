import { readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pub = fileURLToPath(new URL("../public/", import.meta.url));
const files = [];
let total = 0;

for (const dir of ["models", "wasm"]) {
  const p = join(pub, dir);
  if (!existsSync(p)) {
    console.warn(`[offline] public/${dir} was not found`);
    continue;
  }
  for (const name of readdirSync(p).sort()) {
    const st = statSync(join(p, name));
    if (st.isFile()) {
      files.push(`/${dir}/${name}`);
      total += st.size;
    }
  }
}

writeFileSync(
  join(pub, "offline-files.json"),
  JSON.stringify({ files, totalBytes: total }, null, 2)
);
console.log(`[offline] ${files.length} files, ${(total / 1048576).toFixed(1)} MB`);