import { ToneBadge } from "@/components/shared/tone-badge";
import type { Tone } from "@/components/shared/stat-tile";
import type { DeliveryState, DeliveryView } from "@/modules/notifications/domain/delivery";

const STATE: Record<DeliveryState, { label: string; tone: Tone }> = {
  sent: { label: "Accepted", tone: "success" },
  skipped: { label: "Not sent", tone: "neutral" },
  retrying: { label: "Retrying", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
};

const CHANNEL: Record<string, string> = { email: "Email", telegram: "Telegram", whatsapp: "WhatsApp", push: "Phone push" };

/**
 * The last delivery per channel. "Accepted" means the provider took the message; if an accepted email never
 * arrives, look in spam and in the provider's own log (Resend > Emails) using the id shown.
 */
export function DeliveryPanel({ rows, timezone }: { rows: DeliveryView[]; timezone: string }) {
  const fmt = new Intl.DateTimeFormat("en-IN", { timeZone: timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <section aria-labelledby="delivery-heading" className="mb-6 rounded-xl border bg-card p-4 sm:p-5">
      <h2 id="delivery-heading" className="font-medium">
        Last messages sent
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        &ldquo;Accepted&rdquo; means the provider took it. If an email never arrives, check spam and the provider&rsquo;s log with the id below.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No channel is configured, so messages only appear in the bell.</p>
      ) : (
        <ul className="mt-3 divide-y">
          {rows.map((r) => (
            <li key={r.channel} className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-3">
              <span className="w-28 shrink-0 font-medium">{CHANNEL[r.channel] ?? r.channel}</span>
              <ToneBadge tone={STATE[r.state].tone} className="self-start sm:self-auto">
                {STATE[r.state].label}
              </ToneBadge>
              <span className="min-w-0 flex-1 text-muted-foreground">
                {r.at && <span className="tabular-nums">{fmt.format(r.at)}</span>}
                {r.provider && <span> via {r.provider}</span>}
                {r.id && <span className="block truncate font-mono text-xs sm:inline sm:pl-2">id {r.id}</span>}
                {r.note && <span className="block break-words text-xs">{r.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
