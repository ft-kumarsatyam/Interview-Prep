// Copies the Pyodide runtime from node_modules into public/vendor/pyodide so Python runs without the CDN.
// Runs on postinstall. The folder is git-ignored; the app falls back to the CDN when it is missing.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "pyodide");
const to = join(root, "public", "vendor", "pyodide");
const FILES = ["pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];

if (!existsSync(from)) {
  console.warn("[copy-pyodide] node_modules/pyodide not found; Python will load from the CDN.");
  process.exit(0);
}
mkdirSync(to, { recursive: true });
for (const f of FILES) {
  if (!existsSync(join(from, f))) {
    console.warn(`[copy-pyodide] missing ${f}; Python will fall back to the CDN.`);
    continue;
  }
  copyFileSync(join(from, f), join(to, f));
}
console.log(`[copy-pyodide] copied ${FILES.length} files to public/vendor/pyodide`);
