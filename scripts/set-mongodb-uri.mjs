#!/usr/bin/env node
/**
 * Patch .env.local MONGODB_URI after Atlas cluster is created.
 * Usage: node scripts/set-mongodb-uri.mjs cluster0.xxxxx.mongodb.net
 * Reads ATLAS_DB_USER / ATLAS_DB_PASSWORD from .env.atlas-setup if present.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const host = process.argv[2]?.replace(/^mongodb\+srv:\/\//, "").split("/")[0];
if (!host || host.includes(" ")) {
  console.error("Usage: node scripts/set-mongodb-uri.mjs cluster0.xxxxx.mongodb.net");
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");
const localPath = resolve(root, ".env.local");
const atlasPath = resolve(root, ".env.atlas-setup");

let user = "prepos";
let password = "PASSWORD";
if (existsSync(atlasPath)) {
  for (const line of readFileSync(atlasPath, "utf8").split("\n")) {
    const m = line.match(/^(ATLAS_DB_USER|ATLAS_DB_PASSWORD)=(.+)$/);
    if (m?.[1] === "ATLAS_DB_USER") user = m[2].trim();
    if (m?.[1] === "ATLAS_DB_PASSWORD") password = encodeURIComponent(m[2].trim());
  }
} else {
  password = encodeURIComponent(password);
}

const uri = `mongodb+srv://${user}:${password}@${host}/prepos?retryWrites=true&w=majority`;
if (!existsSync(localPath)) {
  console.error("Missing .env.local — copy from .env.example first.");
  process.exit(1);
}

const next = readFileSync(localPath, "utf8").replace(
  /MONGODB_URI="[^"]*"/,
  `MONGODB_URI="${uri}"`,
);
writeFileSync(localPath, next);
console.log(`Updated .env.local MONGODB_URI for host ${host}`);
console.log("Run: npm run seed && restart npm run dev");
