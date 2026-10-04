import type { PushContent } from "@/lib/domain/roast";
import { env } from "@/lib/env";
import { fetchWithPolicy } from "@/lib/http";
import { webPushChannel } from "./web-push";

/** What PWA push needs beyond the text: the structured message, where a tap goes, and a replace-tag. */
export interface PushMeta {
  content: PushContent;
  url: string;
  tag: string;
}

export interface NotifyChannel {
  name: "telegram" | "email" | "whatsapp" | "push";
  /** `html` is an optional richer body for email; channels that can't render it use `body`. */
  send(title: string, body: string, html?: string, meta?: PushMeta): Promise<void>;
}

const TIMEOUT_MS = 10_000;

async function post(url: string, init: RequestInit): Promise<void> {
  // One attempt only: a retried POST could send the same message twice.
  const res = await fetchWithPolicy(url, { headers: init.headers, body: init.body, method: "POST", timeoutMs: TIMEOUT_MS, retries: 0 });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export function telegramChannel(token: string, chatId: string): NotifyChannel {
  return {
    name: "telegram",
    send: (title, body) =>
      post(`https://api.telegram.org/bot${token}/sendMessage`, {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `${title}\n${body}`, disable_web_page_preview: true }),
      }),
  };
}

const RESEND_TEST_SENDER = "onboarding@resend.dev";
const WHATSAPP_MAX_CHARS = 4096;

export function emailChannel(apiKey: string, to: string, from: string = RESEND_TEST_SENDER): NotifyChannel {
  return {
    name: "email",
    send: (title, body, html) =>
      post("https://api.resend.com/emails", {
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          from: `PrepOS <${from}>`,
          to: [to],
          subject: title,
          text: body,
          ...(html ? { html } : {}),
        }),
      }),
  };
}

/** WhatsApp through Whapi.Cloud; `to` is the number with country code, digits only. */
export function whatsappChannel(token: string, to: string, baseUrl: string): NotifyChannel {
  return {
    name: "whatsapp",
    send: (title, body) =>
      post(`${baseUrl.replace(/\/+$/, "")}/messages/text`, {
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ to, body: `*${title}*\n${body}`.slice(0, WHATSAPP_MAX_CHARS) }),
      }),
  };
}

/** Accepts a plain `xkeysib-…` key or the base64 MCP form `{"api_key":"xkeysib-…"}`. */
export function brevoApiKey(raw: string): string {
  const key = raw.trim();
  if (key.startsWith("xkeysib-")) return key;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(key, "base64").toString("utf8"));
    if (parsed && typeof parsed === "object" && "api_key" in parsed && typeof parsed.api_key === "string") {
      return parsed.api_key;
    }
  } catch {
    // Not base64 JSON: use as given.
  }
  return key;
}

export function brevoChannel(apiKey: string, sender: string, to: string): NotifyChannel {
  const key = brevoApiKey(apiKey);
  return {
    name: "email",
    send: (title, body, html) =>
      post("https://api.brevo.com/v3/smtp/email", {
        headers: { "content-type": "application/json", accept: "application/json", "api-key": key },
        body: JSON.stringify({
          sender: { name: "PrepOS", email: sender },
          to: [{ email: to }],
          subject: title,
          textContent: body,
          ...(html ? { htmlContent: html } : {}),
        }),
      }),
  };
}

/** Channels whose env vars are set. Empty is fine: in-app notifications always work. */
export function configuredChannels(): NotifyChannel[] {
  const e = env();
  const channels: NotifyChannel[] = [];
  if (e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_CHAT_ID) channels.push(telegramChannel(e.TELEGRAM_BOT_TOKEN, e.TELEGRAM_CHAT_ID));
  if (e.NOTIFY_EMAIL) {
    if (e.BREVO_API_KEY && e.BREVO_SENDER_EMAIL) channels.push(brevoChannel(e.BREVO_API_KEY, e.BREVO_SENDER_EMAIL, e.NOTIFY_EMAIL));
    else if (e.RESEND_API_KEY) channels.push(emailChannel(e.RESEND_API_KEY, e.NOTIFY_EMAIL, e.RESEND_FROM_EMAIL));
  }
  if (e.WHAPI_TOKEN && e.WHATSAPP_TO) channels.push(whatsappChannel(e.WHAPI_TOKEN, e.WHATSAPP_TO, e.WHAPI_API_URL));
  if (e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY) {
    channels.push(
      webPushChannel({ publicKey: e.VAPID_PUBLIC_KEY, privateKey: e.VAPID_PRIVATE_KEY, subject: e.VAPID_SUBJECT ?? `mailto:${e.ADMIN_EMAIL}` }),
    );
  }
  return channels;
}

/** Best-effort fan-out; returns the channels that failed instead of throwing. */
export async function pushToChannels(
  title: string,
  body: string,
  channels: readonly NotifyChannel[] = configuredChannels(),
  html?: string,
  meta?: PushMeta,
): Promise<{ sent: string[]; failed: string[]; errors: Record<string, string> }> {
  const results = await Promise.allSettled(channels.map((c) => c.send(title, body, html, meta)));
  const sent: string[] = [];
  const failed: string[] = [];
  const errors: Record<string, string> = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled") sent.push(channels[i].name);
    else {
      const message = r.reason instanceof Error ? r.reason.message : String(r.reason);
      failed.push(channels[i].name);
      errors[channels[i].name] = message;
      console.warn(`[notify] ${channels[i].name} failed:`, message);
    }
  });
  return { sent, failed, errors };
}
