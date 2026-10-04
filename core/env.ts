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
  /** Provider order, comma separated. Default "gemini,groq,meta". The paid provider is always tried last. */
  LLM_CHAIN: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  /** Paid last resort. Needs all three: key, an OpenAI-compatible base URL and a model id. */
  META_LLAMA_API_KEY: z.string().optional(),
  META_LLAMA_BASE_URL: z.string().optional(),
  META_LLAMA_MODEL: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  LEETCODE_USERNAME: z.string().regex(/^[\w-]{1,40}$/).optional(),
  RESEND_API_KEY: z.string().optional(),
  /** Sender on a domain verified in Resend, e.g. prepos@satyam-dev.in. Without it Resend's test sender only mails the account owner. */
  RESEND_FROM_EMAIL: z.email().optional(),
  NOTIFY_EMAIL: z.string().optional(),
  /** Whapi.Cloud channel token for WhatsApp messages. */
  WHAPI_TOKEN: z.string().optional(),
  WHAPI_API_URL: z.url().default("https://gate.whapi.cloud"),
  /** Recipient in international format without + or spaces, e.g. 919891142251. */
  WHATSAPP_TO: z.string().regex(/^\d{8,15}$/, "digits only with country code, e.g. 919891142251").optional(),
  /** Web Push (PWA notifications) key pair from `npx web-push generate-vapid-keys`. The public key is sent to the browser. */
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  /** Contact the push services can reach, e.g. `mailto:you@example.com`. Defaults to ADMIN_EMAIL. */
  VAPID_SUBJECT: z.string().optional(),
  /** Brevo v3 key (`xkeysib-…`) or the base64 MCP form `{"api_key":"xkeysib-…"}`. */
  BREVO_API_KEY: z.string().optional(),
  /** Must be a verified sender in Brevo. */
  BREVO_SENDER_EMAIL: z.email().optional(),
  /** Optional Upstash Redis (REST) for locks, rate limits, caches and the live-event log. Without both, MongoDB does the same jobs. */
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  /** Optional Upstash QStash message queue. With token + signing keys + APP_URL, the outbox relay publishes to QStash, which pushes to /api/queue/[topic]. Without them MongoDB polling delivers the same events. */
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_URL: z.url().default("https://qstash.upstash.io"),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
  /** Public base URL used for links in emails, e.g. https://satyam-dev.in */
  APP_URL: z.url().optional(),
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

/** Test seam: drop the cached env so a test can change process.env. */
export function resetEnvForTests(): void {
  cached = undefined;
}
