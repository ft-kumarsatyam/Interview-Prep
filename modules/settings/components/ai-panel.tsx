"use client";

import { useState, useTransition } from "react";
import { Bot, CheckCircle2, CircleAlert, CircleDashed, Loader2, PauseCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { testLlmAction, testPaidLlmAction } from "@/app/(app)/setup/actions";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ProviderRow } from "@/modules/ai/services/ai";
import { cn } from "@/core/utils";
import { formatTokens } from "@/modules/ai/domain/key-rotation";

export interface UsageSummary {
  provider: string;
  feature?: string;
  calls: number;
  fails: number;
  cacheHits: number;
}

const STATUS = {
  ok: { icon: CheckCircle2, label: "Ready", tone: "text-success" },
  cooldown: { icon: PauseCircle, label: "Cooling down", tone: "text-warning" },
  disabled: { icon: CircleAlert, label: "Disabled", tone: "text-warning" },
} as const;

/** Which AI providers are active, how they're doing today, and a way to test them. Keys are never shown. */
export function AiPanel({ providers, usage }: { providers: ProviderRow[]; usage: UsageSummary[] }) {
  const [pending, start] = useTransition();
  const [running, setRunning] = useState<"free" | "paid" | null>(null);
  const [last, setLast] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmPaid, setConfirmPaid] = useState(false);

  const run = (which: "free" | "paid") =>
    start(async () => {
      setRunning(which);
      const res = await (which === "free" ? testLlmAction() : testPaidLlmAction());
      setRunning(null);
      setLast(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
      if (res.ok) toast.success("AI test passed");
      else toast.error("AI test failed. See the details in the AI providers card.");
    });

  const free = providers.filter((p) => !p.paid);
  const readyFree = free.filter((p) => p.configured && p.health === "ok").length;
  const anyFree = free.some((p) => p.configured);
  const paidConfigured = providers.some((p) => p.paid && p.configured);

  return (
    <Card id="ai" className="scroll-mt-32 lg:scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-4 text-muted-foreground" aria-hidden /> AI providers
        </CardTitle>
        <CardDescription className="text-pretty">
          Free providers are tried in order, and a provider that hits its limit is skipped for a while. Paid ones are only a last resort and never run without your confirmation. A provider can have several keys (comma separated); each key has its own token budget. Keys live in your environment, not here.
        </CardDescription>
        <CardAction>
          <span
            className={cn(
              "tabular rounded-full px-2.5 py-1 font-mono text-xs whitespace-nowrap",
              readyFree > 0 ? "bg-success/12 text-success" : "bg-warning/15 text-warning",
            )}
          >
            {readyFree}/{free.length} free ready
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="space-y-2">
          {providers.map((p) => {
            const s = p.configured ? STATUS[p.health] : { icon: CircleDashed, label: "Not set up", tone: "text-muted-foreground" };
            return (
              <li key={p.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                <s.icon className={cn("mt-0.5 size-4 shrink-0", s.tone)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="font-medium">{p.label}</p>
                    {p.paid && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">last resort, costs money</span>}
                    <span className={cn("ml-auto text-xs font-medium", s.tone)}>{s.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs break-words text-muted-foreground">
                    {!p.configured ? (
                      `Needs ${p.missing.join(", ")} in your environment.`
                    ) : (
                      (p.note ?? "Ready to answer.")
                    )}
                  </p>
                  {p.keys && p.keys.length > 1 && (
                    <ul className="mt-2 space-y-1">
                      {p.keys.map((k) => (
                        <li key={k.fingerprint} className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="font-mono">key {k.index + 1} · {k.fingerprint.slice(0, 6)}</span>
                          <span className={cn("tabular font-mono", k.level === "spent" ? "text-destructive" : k.level === "warn" ? "text-warning" : "")}>
                            {formatTokens(k.tokens)} / {formatTokens(k.budget)} tokens
                          </span>
                          {k.health !== "ok" && <span className="text-warning">{STATUS[k.health].label.toLowerCase()}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.keys?.length === 1 && p.keys[0]!.tokens > 0 && (
                    <p className="tabular mt-1 font-mono text-xs text-muted-foreground">
                      {formatTokens(p.keys[0]!.tokens)} / {formatTokens(p.keys[0]!.budget)} tokens on this key
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div>
          <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Today</h3>
          {usage.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI calls yet today.</p>
          ) : (
            <ul className="divide-y text-sm">
              {usage.map((u) => (
                <li key={`${u.provider}:${u.feature}`} className="flex justify-between gap-3 py-2">
                  <span>
                    {u.provider === "cache" ? "Cached answers" : u.provider}
                    {u.feature && <span className="text-muted-foreground"> · {u.feature}</span>}
                  </span>
                  <span className="tabular font-mono text-xs text-muted-foreground">
                    {u.provider === "cache" ? `${u.cacheHits} served` : `${u.calls} calls${u.fails ? `, ${u.fails} failed` : ""}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-9" disabled={pending || !anyFree} onClick={() => run("free")}>
              {running === "free" && <Loader2 className="animate-spin" aria-hidden />}
              {running === "free" ? "Testing…" : "Test free providers"}
            </Button>
            {paidConfigured && (
              <Button type="button" variant="outline" className="h-9" disabled={pending} onClick={() => setConfirmPaid(true)}>
                {running === "paid" && <Loader2 className="animate-spin" aria-hidden />}
                {running === "paid" ? "Testing…" : "Test paid provider (costs money)"}
              </Button>
            )}
          </div>
          {!anyFree && <p className="text-xs text-muted-foreground">Set NVIDIA_API_KEYS, OPENROUTER_API_KEYS, GEMINI_API_KEY or GROQ_API_KEY to turn on AI. Without one, quizzes use the built-in question bank.</p>}
        </div>

        {last && (
          <div
            role="status"
            className={cn("flex items-start gap-2 rounded-lg border p-3 text-xs break-words", last.ok ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}
          >
            {last.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />}
            <p className="min-w-0">
              <span className="font-medium">{last.ok ? "Passed. " : "Failed. "}</span>
              {last.text}
            </p>
          </div>
        )}
      </CardContent>

      <Dialog open={confirmPaid} onOpenChange={setConfirmPaid}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test the paid provider?</DialogTitle>
            <DialogDescription>This makes one real call to the paid provider and may charge your card a small amount. It also counts toward today&apos;s paid call cap.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                setConfirmPaid(false);
                run("paid");
              }}
            >
              Make one paid call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
