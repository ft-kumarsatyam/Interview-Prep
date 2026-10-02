import { z } from "zod";

const schema = z.object({
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, "must be a mongodb:// or mongodb+srv:// URI"),
  AUTH_SECRET: z.string().min(32, "generate with: openssl rand -base64 32"),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD_HASH_B64: z.string().min(20, "generate with: npm run hash -- 'your-password'"),
  ADMIN_NAME: z.string().min(1).default("there"),
  APP_TIMEZONE: z.string().default("Asia/Kolkata"),
  CRON_SECRET: z.string().min(16).optional(),
  LLM_PROVIDER: z.enum(["gemini", "anthropic", "openai-compatible"]).optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_BASE_URL: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  LEETCODE_USERNAME: z.string().regex(/^[\w-]{1,40}$/).optional(),
  RESEND_API_KEY: z.string().optional(),
  NOTIFY_EMAIL: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server env. Read lazily so `next build` works without secrets. */
export function env(): Env {
  if (cached) return cached;
  // Treat empty strings from .env templates as "not set" so optional vars stay optional.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables (see .env.example):\n${problems}`);
  }
  cached = parsed.data;
  return cached;
}
