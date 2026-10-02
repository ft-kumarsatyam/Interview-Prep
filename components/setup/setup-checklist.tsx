"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, CircleDashed, Download, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { syncLeetCodeNow } from "@/app/(app)/dashboard/actions";
import { refreshNewsAction } from "@/app/(app)/news/actions";
import { reseedAction, testNotificationAction } from "@/app/(app)/settings/actions";
import { runMorningAction, testLlmAction } from "@/app/(app)/setup/actions";
import { IosInstallSteps, promptInstall, useInstallState } from "@/components/layout/install-hint";
import { Button } from "@/components/ui/button";
import type { CheckStatus, SetupAction, SetupActionId, SetupItem } from "@/lib/domain/setup";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<CheckStatus, string> = { ok: "Done", warn: "Needs attention", todo: "To do" };
const STATUS_TONE: Record<CheckStatus, string> = { ok: "text-success", warn: "text-warning", todo: "text-muted-foreground" };

export function StatusIcon({ status, className }: { status: CheckStatus; className?: string }) {
  const Icon = status === "ok" ? CheckCircle2 : status === "warn" ? AlertCircle : CircleDashed;
  return <Icon className={cn("size-5 shrink-0", STATUS_TONE[status], className)} aria-label={STATUS_LABEL[status]} />;
}

async function run(id: SetupActionId): Promise<boolean> {
  switch (id) {
    case "seed": {
      const r = await reseedAction();
      if (r.ok) toast.success(r.message);
      else toast.error(`${r.error}. Check MONGODB_URI and try again.`);
      return r.ok;
    }
    case "sync-leetcode": {
      const r = await syncLeetCodeNow();
      if (r.ok) toast.success(r.message);
      else toast.error(`${r.error}. Check the username in Settings and try again.`);
      return r.ok;
    }
    case "run-morning": {
      const r = await runMorningAction();
      if (r.ok) toast.success(r.message);
      else toast.error(`${r.error}. Details are in the server log.`);
      return r.ok;
    }
    case "refresh-news": {
      const r = await refreshNewsAction();
      if (!r.ok) {
        toast.error(`${r.error}. Try again in a minute.`);
        return false;
      }
      toast.success(r.fresh ? "Already refreshed in the last minute" : `${r.inserted} new articles${r.failed ? ` · ${r.failed} feeds failed` : ""}`);
      return true;
    }
    case "test-notify": {
      const r = await testNotificationAction();
      if (!r.ok) {
        toast.error(`${r.error}.`);
        return false;
      }
      if (r.sent.length) toast.success(`Sent via ${r.sent.join(" and ")}. Check your phone or inbox.`);
      if (r.failed.length) toast.error(`${r.failed.join(" and ")} failed. Check the env vars.`);
      return r.failed.length === 0;
    }
    case "test-llm": {
      const r = await testLlmAction();
      if (r.ok) toast.success(r.message);
      else toast.error(`${r.error}.`);
      return r.ok;
    }
  }
}

function ActionButton({ action, primary }: { action: SetupAction; primary?: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const variant = primary ? "default" : "outline";
  if (action.kind === "link") {
    return (
      <Button asChild variant={variant} className="h-9">
        <a href={action.href} download={action.download}>
          {action.download && <Download aria-hidden />} {action.label}
        </a>
      </Button>
    );
  }
  return (
    <Button
      variant={variant}
      className="h-9"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        start(async () => {
          await run(action.id);
          router.refresh();
        })
      }
    >
      {pending && <Loader2 className="animate-spin" aria-hidden />} {action.label}
    </Button>
  );
}

function Row({
  id,
  status,
  title,
  detail,
  required,
  next,
  children,
}: {
  id?: string;
  status: CheckStatus;
  title: string;
  detail: React.ReactNode;
  required?: boolean;
  next?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li id={id} className={cn("flex scroll-mt-20 gap-3 rounded-xl border bg-card p-4", next && "border-primary/50 ring-1 ring-primary/20")}>
      <StatusIcon status={status} className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-medium">{title}</h3>
          {next && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Next</span>}
          {required && status !== "ok" && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Essential</span>}
          <span className={cn("ml-auto text-xs font-medium", STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>
        </div>
        <div className="text-sm text-pretty text-muted-foreground">{detail}</div>
        {children}
      </div>
    </li>
  );
}

function InstallRow() {
  const state = useInstallState();
  if (state === "installed") return <Row status="ok" title="Installed as an app" detail="You're using the installed app. It opens full-screen from your home screen." />;
  if (state === "promptable") {
    return (
      <Row status="warn" title="Install as an app" detail="This browser can install PrepOS as an app.">
        <Button className="h-9" onClick={() => void promptInstall()}>
          <Smartphone aria-hidden /> Install
        </Button>
      </Row>
    );
  }
  return (
    <Row
      status="warn"
      title="Install on your iPhone"
      detail={state === "ios" ? <IosInstallSteps /> : <>Open your PrepOS URL on your iPhone, then: <IosInstallSteps /></>}
    />
  );
}

function ItemRow({ item, next }: { item: SetupItem; next?: boolean }) {
  return (
    <Row id={`setup-${item.id}`} status={item.status} title={item.title} detail={item.detail} required={item.required} next={next}>
      {item.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {item.actions.map((a, i) => (
            <ActionButton key={a.label} action={a} primary={next && i === 0} />
          ))}
        </div>
      )}
    </Row>
  );
}

/** Open items first (essentials before optional), then the finished ones folded away. */
function orderSetupItems(items: SetupItem[]): { open: SetupItem[]; done: SetupItem[] } {
  const open = items.filter((i) => i.status !== "ok").toSorted((a, b) => Number(b.required) - Number(a.required));
  return { open, done: items.filter((i) => i.status === "ok") };
}

export function SetupChecklistView({ items }: { items: SetupItem[] }) {
  const { open, done } = orderSetupItems(items);
  return (
    <div className="space-y-6">
      <section aria-labelledby="setup-open">
        <h2 id="setup-open" className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {open.length ? `To do · ${open.length}` : "To do"}
        </h2>
        {open.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-success" aria-hidden /> Everything is set up. PrepOS runs on its own now.
          </p>
        ) : (
          <ul className="space-y-3">
            {open.map((item, i) => (
              <ItemRow key={item.id} item={item} next={i === 0} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="setup-phone">
        <h2 id="setup-phone" className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          On your phone
        </h2>
        <ul>
          <InstallRow />
        </ul>
      </section>

      {done.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium select-none hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
            <CheckCircle2 className="size-4 text-success" aria-hidden />
            Done · {done.length}
            <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="mt-3 space-y-3">
            {done.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
