"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createTokenAction, revokeTokenAction } from "@/app/(app)/settings/api-tokens/actions";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { API_SCOPES, DEFAULT_TOKEN_DAYS, SCOPE_LABEL, type ApiScope } from "@/core/domain/api-token";
import type { TokenSummary } from "@/core/services/api-tokens";

const field = "h-9 rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const STATE_TONE = { ok: "success", expired: "warning", revoked: "neutral" } as const;
const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Create, copy once, and revoke API tokens. The secret is shown only in the moment it is created. */
export function ApiTokensPanel({ tokens }: { tokens: TokenSummary[] }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>(["capture:write"]);
  const [days, setDays] = useState(DEFAULT_TOKEN_DAYS);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const toggle = (s: ApiScope) => setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const create = () =>
    start(async () => {
      const res = await createTokenAction({ name, scopes, days });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setFresh(res.token);
      setCopied(false);
      setName("");
    });
  const copy = async () => {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh);
      setCopied(true);
    } catch {
      toast.error("Couldn't copy. Select the token and copy it by hand.");
    }
  };
  const revoke = (id: string) =>
    start(async () => {
      const res = await revokeTokenAction(id);
      if (!res.ok) toast.error(`${res.error}.`);
      else toast.success("Token revoked.");
    });

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border bg-card p-4 sm:p-5" aria-label="Create a token">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <KeyRound className="size-4" aria-hidden /> New token
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <label htmlFor="tok-name" className="text-xs font-medium">
              Name
            </label>
            <input id="tok-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Chrome extension" className={`${field} w-full`} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="tok-days" className="text-xs font-medium">
              Expires after
            </label>
            <select id="tok-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className={field}>
              {[30, 90, 180, 365].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>
        </div>
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-medium">What it can do</legend>
          {API_SCOPES.map((s) => (
            <label key={s} className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(s)} className="mt-1" />
              <span>
                {SCOPE_LABEL[s]} <code className="text-xs text-muted-foreground">{s}</code>
              </span>
            </label>
          ))}
        </fieldset>
        <Button type="button" size="sm" onClick={create} disabled={pending || name.trim().length < 2 || scopes.length === 0}>
          Create token
        </Button>

        {fresh && (
          <div role="status" className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <p className="font-medium">Copy it now. It won&apos;t be shown again.</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 rounded bg-background px-2 py-1.5 font-mono text-xs break-all">{fresh}</code>
              <Button type="button" size="sm" variant="outline" onClick={copy}>
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setFresh(null)}>
              I&apos;ve saved it
            </Button>
          </div>
        )}
      </section>

      <section aria-label="Your tokens" className="space-y-2">
        <h2 className="text-base font-semibold">Your tokens</h2>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tokens yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {tokens.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3 text-sm">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {t.name} <ToneBadge tone={STATE_TONE[t.state]}>{t.state === "ok" ? "Active" : t.state === "expired" ? "Expired" : "Revoked"}</ToneBadge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <code>pk_{t.prefix}_…</code> · {t.scopes.join(", ")} · expires {date(t.expiresAt)} · {t.lastUsedAt ? `last used ${date(t.lastUsedAt)}` : "never used"}
                  </p>
                </div>
                {t.state === "ok" && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => revoke(t.id)} disabled={pending} aria-label={`Revoke ${t.name}`}>
                    <Trash2 aria-hidden /> Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
