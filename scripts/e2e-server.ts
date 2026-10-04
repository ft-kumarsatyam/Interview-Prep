/**
 * Starts everything an end-to-end run needs, with no Docker and no real services: an in-memory MongoDB replica set, a seeded
 * database, and the Next.js server on port 3100. Playwright launches this (playwright.config.ts) and stops it afterwards.
 *
 *   E2E_DEV=1  use `next dev` (no build or type check needed) instead of `next start` (needs `npm run build` first)
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/** Every variable that connects the app to something outside the machine. They are all blanked for e2e. */
const EXTERNAL = [
  "LLM_PROVIDER", "LLM_API_KEY", "LLM_MODEL", "LLM_BASE_URL", "LLM_CHAIN", "GEMINI_API_KEY", "GEMINI_MODEL", "GROQ_API_KEY", "GROQ_MODEL", "META_LLAMA_API_KEY", "META_LLAMA_BASE_URL", "META_LLAMA_MODEL",
  "NVIDIA_API_KEYS", "NVIDIA_MODEL", "OPENROUTER_API_KEYS", "OPENROUTER_MODEL", "OPENAI_API_KEYS", "OPENAI_MODEL", "LLM_EXTRA_PROVIDERS",
  "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "RESEND_API_KEY", "RESEND_FROM_EMAIL", "BREVO_API_KEY", "BREVO_SENDER_EMAIL", "NOTIFY_EMAIL", "WHAPI_TOKEN", "WHAPI_API_URL", "WHATSAPP_TO",
  "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "LEETCODE_USERNAME", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "QSTASH_TOKEN", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY",
  "GITHUB_TOKEN", "APP_URL", "OTEL_EXPORTER_OTLP_ENDPOINT", "OTEL_EXPORTER_OTLP_HEADERS", "VERCEL_OIDC_TOKEN",
];

export const E2E = { port: 3100, email: "e2e@example.com", password: "e2e-password-123456", cronSecret: "e2e-cron-secret-1234567890", webhookSecret: "e2e-webhook-secret-1234567890" };

async function main() {
  const dev = process.env.E2E_DEV === "1";
  const distDir = dev ? ".next-e2e" : (process.env.NEXT_DIST_DIR ?? ".next");
  if (!dev && !existsSync(`${distDir}/BUILD_ID`)) throw new Error("No production build. Run `npm run build` first, or set E2E_DEV=1.");
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const env = {
    ...process.env,
    MONGODB_URI: mongod.getUri("prepos-e2e"),
    AUTH_SECRET: "e2e-auth-secret-e2e-auth-secret-12345",
    ADMIN_EMAIL: E2E.email,
    ADMIN_PASSWORD_HASH_B64: Buffer.from(bcrypt.hashSync(E2E.password, 4), "utf8").toString("base64"),
    ADMIN_NAME: "Tester",
    APP_TIMEZONE: "Asia/Kolkata",
    CRON_SECRET: E2E.cronSecret,
    JOBS_WEBHOOK_SECRET: E2E.webhookSecret,
    ...(dev ? { NEXT_DIST_DIR: distDir } : {}),
    NODE_ENV: dev ? "development" : "production",
    NEXT_TELEMETRY_DISABLED: "1",
    // Nothing outside this machine may be reachable from an e2e run: no AI, push, email, chat, queue, cache, telemetry or
    // LeetCode lookups, even if your own .env.local defines them. (Also part of what is tested: the app works with none of them.)
    ...Object.fromEntries(EXTERNAL.map((k) => [k, ""])),
  };
  Object.assign(process.env, env);

  const { runMigrations } = await import("@/core/db/migrations/runner");
  const { seedContent } = await import("@/core/services/seed");
  await runMigrations();
  await seedContent();
  // The plan window must include today, or there is no daily plan and no quiz to test. Set it as a fixture, not through the UI.
  const { Settings } = await import("@/core/models/system");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  await Settings.updateOne({ _id: "settings" }, { $set: { startDate: today } });
  await mongoose.disconnect();

  const child = spawn("node_modules/.bin/next", [dev ? "dev" : "start", "-p", String(E2E.port)], { env: env as NodeJS.ProcessEnv, stdio: "inherit" });
  const stop = async () => {
    child.kill("SIGTERM");
    await mongod.stop();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  child.on("exit", async (code) => {
    await mongod.stop();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
