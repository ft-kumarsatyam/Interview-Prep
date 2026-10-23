// Copies the PGlite (Postgres in WebAssembly) runtime from node_modules to public/vendor/pglite so DB Lab's Postgres
// mode loads it from our own origin. The output is about 17 MB, so it is git-ignored and recreated on install.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@electric-sql", "pglite", "dist");
const out = join(root, "public", "vendor", "pglite");

if (!existsSync(src)) {
  console.warn("copy-pglite: @electric-sql/pglite is not installed, skipping.");
  process.exit(0);
}
mkdirSync(out, { recursive: true });
const wanted = readdirSync(src).filter((f) => f === "index.js" || /^chunk-.*\.js$/.test(f) || f === "pglite.wasm" || f === "pglite.data" || f === "initdb.wasm");
for (const f of wanted) cpSync(join(src, f), join(out, f));
console.log(`copy-pglite: ${wanted.length} files -> public/vendor/pglite`);
