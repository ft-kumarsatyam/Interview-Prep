import { env } from "@/lib/env";

export interface NotifyChannel {
  name: "telegram" | "email";
  send(title: string, body: string): Promise<void>;
}

const TIMEOUT_MS = 10_000;

async function post(url: string, init: RequestInit): Promise<void> {
  const res = await fetch(url, { ...init, method: "POST", signal: AbortSignal.timeout(TIMEOUT_MS) });
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

export function emailChannel(apiKey: string, to: string): NotifyChannel {
  return {
    name: "email",
    send: (title, body) =>
      post("https://api.resend.com/emails", {
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from: "PrepOS <onboarding@resend.dev>", to: [to], subject: title, text: body }),
      }),
  };
}

/** Channels whose env vars are set. Empty is fine: in-app notifications always work. */
export function configuredChannels(): NotifyChannel[] {
  const e = env();
  const channels: NotifyChannel[] = [];
  if (e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_CHAT_ID) channels.push(telegramChannel(e.TELEGRAM_BOT_TOKEN, e.TELEGRAM_CHAT_ID));
  if (e.RESEND_API_KEY && e.NOTIFY_EMAIL) channels.push(emailChannel(e.RESEND_API_KEY, e.NOTIFY_EMAIL));
  return channels;
}

/** Best-effort fan-out; returns the channels that failed instead of throwing. */
export async function pushToChannels(
  title: string,
  body: string,
  channels: readonly NotifyChannel[] = configuredChannels(),
): Promise<{ sent: string[]; failed: string[] }> {
  const results = await Promise.allSettled(channels.map((c) => c.send(title, body)));
  const sent: string[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") sent.push(channels[i].name);
    else {
      failed.push(channels[i].name);
      console.warn(`[notify] ${channels[i].name} failed:`, r.reason instanceof Error ? r.reason.message : r.reason);
    }
  });
  return { sent, failed };
}
