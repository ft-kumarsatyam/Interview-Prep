"use client";

import { useOptimistic, useState, useTransition } from "react";
import { AlertTriangle, Bell, CalendarRange, CheckCircle2, CircleDashed, Flame, Briefcase, CalendarDays, FileText, Layers, Moon, Newspaper, RefreshCw, Send, Sun, Sunset, Zap } from "lucide-react";
import { toast } from "sonner";
import { setMailPrefAction, setRoastLevelAction, testNotificationAction } from "@/app/(app)/settings/actions";
import { Chip } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MAIL_INFO, MAIL_KINDS, type MailKind, type MailPrefs } from "@/modules/notifications/domain/mail-prefs";
import { ROAST_LEVELS, ROAST_LEVEL_HINT, ROAST_LEVEL_LABEL, roastFor, type RoastLevel, type RoastMailSlot } from "@/modules/resume/domain/roast";

type Kind = "ping" | "morning" | "briefing" | "design" | "alerts" | "jobs" | "resume" | "calendar" | "nudge" | "night" | "weekly";
type Result =
  | { ok: true; subject: string; sent: string[]; failed: string[]; errors: Record<string, string>; sample: boolean; to: string | null }
  | { ok: false; error: string };

/** Example moments for the roast preview, each with believable numbers. */
const PREVIEW_MOMENTS: Array<{ slot: RoastMailSlot; label: string; ctx: Parameters<typeof roastFor>[2] }> = [
  { slot: "morning", label: "Morning, 12 behind", ctx: { backlog: 12, streak: 5, daysLeft: 120 } },
  { slot: "morning", label: "Morning, streak going", ctx: { backlog: 0, streak: 9, daysLeft: 120 } },
  { slot: "evening", label: "Evening, 3 left", ctx: { left: 3, pct: 40, streak: 5 } },
  { slot: "night", label: "Night, day done", ctx: { pct: 100, solved: 4, streak: 6 } },
  { slot: "night", label: "Night, nothing done", ctx: { pct: 0, streak: 6 } },
  { slot: "weekly", label: "Weekly, 50%", ctx: { weekPct: 50 } },
];
const MAIL_ICON: Record<MailKind, typeof Sun> = { morning: Sun, briefing: Newspaper, design: Layers, alerts: Zap, jobs: Briefcase, resume: FileText, calendar: CalendarDays, nudge: Sunset, night: Moon, weekly: CalendarRange };

const TESTS: Array<{ kind: Kind; label: string; icon: typeof Send }> = [
  { kind: "ping", label: "Quick ping", icon: Send },
  { kind: "morning", label: "Morning plan", icon: Sun },
  { kind: "briefing", label: "Daily briefing", icon: Newspaper },
  { kind: "design", label: "System design topic", icon: Layers },
  { kind: "alerts", label: "News alert", icon: Zap },
  { kind: "jobs", label: "Job matches", icon: Briefcase },
  { kind: "resume", label: "Resume check", icon: FileText },
  { kind: "calendar", label: "Calendar heads-up", icon: CalendarDays },
  { kind: "nudge", label: "Evening nudge", icon: Sunset },
  { kind: "night", label: "Night recap", icon: Moon },
  { kind: "weekly", label: "Weekly report", icon: CalendarRange },
];

/** Plain-language next step for the common provider errors. */
function hintFor(channel: string, error: string): string {
  if (channel === "push") {
    if (/no device|expired/i.test(error)) return "Turn on App notifications below, on each phone or computer that should get them.";
    if (/401|403/i.test(error)) return "The push service rejected the VAPID keys. Check VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are a matching pair.";
    return "Check the device is online and notifications are still allowed for this site.";
  }
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
  roastLevel,
  mail,
  emailTo,
  name,
}: {
  channels: Array<{ name: string; configured: boolean; envVars: string; offHint?: string }>;
  roastLevel: RoastLevel;
  mail: MailPrefs;
  emailTo: string | null;
  name: string;
}) {
  const anyConfigured = channels.some((c) => c.configured);
  const [level, setOptimisticLevel] = useOptimistic(roastLevel);
  const [prefs, setOptimisticPref] = useOptimistic(mail, (cur: MailPrefs, next: { kind: MailKind; on: boolean }) => ({ ...cur, [next.kind]: next.on }));
  const [, startRoast] = useTransition();
  const [, startPref] = useTransition();
  const [sending, startSend] = useTransition();
  const [active, setActive] = useState<Kind | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);

  const chooseLevel = (next: RoastLevel) =>
    startRoast(async () => {
      setOptimisticLevel(next);
      const res = await setRoastLevelAction(next);
      if (!res.ok) toast.error(`${res.error}. Try again.`);
      else toast.success(next === "off" ? "Roast off. Plain emails from now on." : next === "coach" ? "Coach mode: firm and encouraging." : "Savage mode on. Ab bach ke dikha.");
    });

  const togglePref = (kind: MailKind, on: boolean) =>
    startPref(async () => {
      setOptimisticPref({ kind, on });
      const res = await setMailPrefAction({ kind, on });
      if (!res.ok) toast.error(`${res.error}. Try again.`);
      else toast.success(`${MAIL_INFO[kind].label} ${on ? "on" : "off"}.`);
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

  const moment = PREVIEW_MOMENTS[previewIdx % PREVIEW_MOMENTS.length]!;
  const preview = roastFor(level, moment.slot, moment.ctx, `preview-${previewIdx}`, name);

  return (
    <Card id="notifications" className="scroll-mt-32 lg:scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4 text-muted-foreground" aria-hidden /> Notification channels
        </CardTitle>
        <CardDescription>Daily plan (DSA, theory, quiz), news and system design topic, job matches, resume and calendar updates, evening nudge, night recap and weekly report. In-app notifications always work; email, Telegram and WhatsApp are set with env vars.</CardDescription>
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
                    {c.offHint ?? (
                      <>
                        Set <code className="font-mono">{c.envVars}</code> to turn it on.
                      </>
                    )}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <fieldset className="space-y-2 rounded-lg border p-3">
          <legend className="px-1 text-sm font-medium">What you get</legend>
          <ul className="space-y-2">
            {MAIL_KINDS.map((kind) => {
              const Icon = MAIL_ICON[kind];
              const info = MAIL_INFO[kind];
              return (
                <li key={kind}>
                  <label htmlFor={`mail-${kind}`} className="flex cursor-pointer items-start gap-3">
                    <Checkbox id={`mail-${kind}`} checked={prefs[kind]} onCheckedChange={(c) => togglePref(kind, c === true)} className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> {info.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {info.when}. {info.what}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">Turning one off still posts it to the in-app bell; only the pushed copies (app, email, Telegram, WhatsApp) stop. The evening nudge needs the optional scheduler described in the README.</p>
        </fieldset>

        <div className="space-y-3 rounded-lg border p-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Flame className="size-3.5 text-primary" aria-hidden /> Roast level
            </p>
            <p className="text-xs text-muted-foreground">Each email leads with a line in the subject that uses your real numbers: backlog, streak, what is left, how the week went.</p>
          </div>
          <div role="group" aria-label="Roast level" className="flex flex-wrap gap-1.5">
            {ROAST_LEVELS.map((l) => (
              <Chip key={l} pressed={level === l} onClick={() => chooseLevel(l)}>
                {ROAST_LEVEL_LABEL[l]}
              </Chip>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{ROAST_LEVEL_HINT[level]}</p>
          {preview && (
            <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary">&ldquo;{preview}&rdquo;</p>
                <p className="text-2xs text-muted-foreground">Example: {moment.label}</p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Show another example" onClick={() => setPreviewIdx((i) => i + 1)}>
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
            Each test sends the real email for today (the weekly one covers the latest Sunday), marked [Test].
          </p>
          <div className="flex flex-wrap gap-2">
            {TESTS.map(({ kind, label, icon: Icon }) => (
              <Button key={kind} variant="outline" className="h-9 shrink-0 whitespace-nowrap pointer-coarse:h-11" onClick={() => send(kind)} loading={active === kind} disabled={!anyConfigured || sending}>
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
            <p className="mt-1 font-mono text-2xs break-words text-muted-foreground/80">{result.errors[channel]}</p>
          </div>
        </div>
      ))}
      {result.sample && <p className="text-xs text-muted-foreground">Your plan hasn&apos;t started yet, so this was a sample email.</p>}
    </div>
  );
}
