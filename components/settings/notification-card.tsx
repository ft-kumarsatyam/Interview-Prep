"use client";

import { useOptimistic, useState, useTransition } from "react";
import { AlertTriangle, Bell, CheckCircle2, CircleDashed, Flame, Moon, RefreshCw, Send, Sun } from "lucide-react";
import { toast } from "sonner";
import { setRoastModeAction, testNotificationAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ROAST_LINES } from "@/lib/domain/roast";

type Kind = "ping" | "morning" | "evening";
type Result =
  | { ok: true; subject: string; sent: string[]; failed: string[]; errors: Record<string, string>; sample: boolean; to: string | null }
  | { ok: false; error: string };

const PREVIEW = [...ROAST_LINES.morning, ...ROAST_LINES.evening];

const TESTS: Array<{ kind: Kind; label: string; icon: typeof Send }> = [
  { kind: "ping", label: "Quick ping", icon: Send },
  { kind: "morning", label: "Morning mail", icon: Sun },
  { kind: "evening", label: "Evening mail", icon: Moon },
];

/** Plain-language next step for the common provider errors. */
function hintFor(channel: string, error: string): string {
  if (channel === "whatsapp") {
    if (/401|403|unauthori[sz]ed|token/i.test(error)) return "Whapi rejected the token. Copy WHAPI_TOKEN again from the Whapi dashboard and redeploy.";
    if (/402|limit|trial|plan/i.test(error)) return "The Whapi plan limit or trial ran out. Check the channel in the Whapi dashboard.";
    return "Check that the Whapi channel is authorized (scan the QR again if needed) and WHATSAPP_TO is digits with country code.";
  }
  if (/401|unauthori[sz]ed|invalid.*key|key.*invalid/i.test(error)) return "The API key was rejected. Copy it again into the env var and redeploy.";
  if (/sender|not.*verified|domain/i.test(error)) return "The sender address isn't verified with the provider. Verify BREVO_SENDER_EMAIL in Brevo.";
  if (/403/i.test(error)) return "The provider refused it. Without RESEND_FROM_EMAIL, Resend's test sender only mails the address you signed up with.";
  if (/timeout|abort/i.test(error)) return "The provider didn't answer in 10 s. Try again in a minute.";
  if (/chat not found|400/i.test(error)) return "Telegram couldn't find the chat. Send /start to your bot, then check TELEGRAM_CHAT_ID.";
  return "Check the env vars for this channel, then try again.";
}

export function NotificationCard({
  channels,
  roastMode,
  emailTo,
  name,
}: {
  channels: Array<{ name: string; configured: boolean; envVars: string }>;
  roastMode: boolean;
  emailTo: string | null;
  name: string;
}) {
  const anyConfigured = channels.some((c) => c.configured);
  const [roast, setOptimisticRoast] = useOptimistic(roastMode);
  const [, startRoast] = useTransition();
  const [sending, startSend] = useTransition();
  const [active, setActive] = useState<Kind | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);

  const toggleRoast = (on: boolean) =>
    startRoast(async () => {
      setOptimisticRoast(on);
      const res = await setRoastModeAction(on);
      if (!res.ok) toast.error(`${res.error}. Try again.`);
      else toast.success(on ? "Roast mode on. Ab bach ke dikha." : "Roast mode off. Plain emails from now on.");
    });

  const send = (kind: Kind) => {
    setActive(kind);
    setResult(null);
    startSend(async () => {
      const res = await testNotificationAction(kind);
      setResult(res);
      setActive(null);
      if (!res.ok) toast.error(`${res.error}.`);
      else if (res.failed.length === 0) toast.success(`Sent via ${res.sent.join(" and ")}. Check your inbox.`);
      else toast.error(`${res.failed.join(" and ")} failed. Details below.`);
    });
  };

  const preview = PREVIEW[previewIdx % PREVIEW.length].replaceAll("{name}", name);

  return (
    <Card id="notifications" className="scroll-mt-32 lg:scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4 text-muted-foreground" aria-hidden /> Notification channels
        </CardTitle>
        <CardDescription>Morning plan at 08:00 and evening recap at 23:59. In-app notifications always work; email, Telegram and WhatsApp are set with env vars.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          {channels.map((c) => (
            <li key={c.name} className="flex items-start gap-3 rounded-lg border p-3">
              {c.configured ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              ) : (
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className={c.configured ? "text-xs font-medium text-success" : "text-xs text-muted-foreground"}>{c.configured ? "On" : "Off"}</span>
                </div>
                {!c.configured && (
                  <p className="mt-0.5 text-xs break-words text-muted-foreground">
                    Set <code className="font-mono">{c.envVars}</code> to turn it on.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-3 rounded-lg border p-3">
          <label htmlFor="roastMode" className="flex cursor-pointer items-start gap-3">
            <Checkbox id="roastMode" checked={roast} onCheckedChange={(c) => toggleRoast(c === true)} className="mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Flame className="size-3.5 text-primary" aria-hidden /> Roast mode
              </span>
              <span className="block text-xs text-muted-foreground">
                Each email starts with a desi one-liner in the subject. A finished day gets praise, an unfinished one gets roasted.
              </span>
            </span>
          </label>
          {roast && (
            <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2">
              <p className="min-w-0 flex-1 text-sm font-medium text-primary">&ldquo;{preview}&rdquo;</p>
              <Button variant="ghost" size="icon-sm" aria-label="Show another line" onClick={() => setPreviewIdx((i) => i + 1 + Math.floor(Math.random() * 5))}>
                <RefreshCw aria-hidden />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Send a test</p>
          <p className="text-xs text-muted-foreground">
            {emailTo ? (
              <>
                Email goes to <span className="font-mono text-foreground">{emailTo}</span>.{" "}
              </>
            ) : null}
            Morning and evening send the real email for today, marked [Test].
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TESTS.map(({ kind, label, icon: Icon }) => (
              <Button key={kind} variant="outline" className="h-9" onClick={() => send(kind)} loading={active === kind} disabled={!anyConfigured || sending}>
                {active !== kind && <Icon aria-hidden />} {active === kind ? "Sending…" : label}
              </Button>
            ))}
          </div>
          {!anyConfigured && <p className="text-xs text-muted-foreground">Turn on at least one channel above to send a test.</p>}
        </div>

        {result && <TestResult result={result} />}
      </CardContent>
    </Card>
  );
}

function TestResult({ result }: { result: Result }) {
  if (!result.ok) {
    return (
      <div role="alert" className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <p>{result.error}.</p>
      </div>
    );
  }
  return (
    <div role="status" className="space-y-2 rounded-lg border p-3 text-sm">
      <p className="text-xs text-muted-foreground">
        Subject: <span className="text-foreground">{result.subject}</span>
      </p>
      {result.sent.length > 0 && (
        <p className="flex gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>
            Delivered to {result.sent.join(" and ")}
            {result.to && result.sent.includes("email") ? ` (${result.to})` : ""}. Not in your inbox within a minute? Check Spam and Promotions.
          </span>
        </p>
      )}
      {result.failed.map((channel) => (
        <div key={channel} className="flex gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium capitalize">{channel} failed</p>
            <p className="text-xs text-muted-foreground">{hintFor(channel, result.errors[channel] ?? "")}</p>
            <p className="mt-1 font-mono text-[11px] break-words text-muted-foreground/80">{result.errors[channel]}</p>
          </div>
        </div>
      ))}
      {result.sample && <p className="text-xs text-muted-foreground">Your plan hasn&apos;t started yet, so this was a sample email.</p>}
    </div>
  );
}
