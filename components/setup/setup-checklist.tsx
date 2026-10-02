"use client";

import { useTransition } from "react";
import { AlertCircle, CheckCircle2, CircleDashed, Download, Loader2 } from "lucide-react";
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

export function StatusIcon({ status, className }: { status: CheckStatus; className?: string }) {
  const Icon = status === "ok" ? CheckCircle2 : status === "warn" ? AlertCircle : CircleDashed;
  return (
    <Icon
      className={cn("size-5 shrink-0", status === "ok" ? "text-success" : status === "warn" ? "text-warning" : "text-muted-foreground", className)}
      aria-label={STATUS_LABEL[status]}
    />
  );
}

async function run(id: SetupActionId): Promise<void> {
  switch (id) {
    case "seed": {
      const r = await reseedAction();
      return void (r.ok ? toast.success(r.message) : toast.error(`${r.error}.`));
    }
    case "sync-leetcode": {
      const r = await syncLeetCodeNow();
      return void (r.ok ? toast.success(r.message) : toast.error(`${r.error}.`));
    }
    case "run-morning": {
      const r = await runMorningAction();
      return void (r.ok ? toast.success(r.message) : toast.error(`${r.error}. Details are in the server log.`));
    }
    case "refresh-news": {
      const r = await refreshNewsAction();
      if (!r.ok) return void toast.error(`${r.error}.`);
      return void toast.success(r.fresh ? "Already refreshed in the last minute" : `${r.inserted} new articles${r.failed ? ` · ${r.failed} feeds failed` : ""}`);
    }
    case "test-notify": {
      const r = await testNotificationAction();
      if (!r.ok) return void toast.error(`${r.error}.`);
      if (r.sent.length) toast.success(`Sent via ${r.sent.join(" and ")}`);
      if (r.failed.length) toast.error(`${r.failed.join(" and ")} failed. Check the env vars.`);
      return;
    }
    case "test-llm": {
      const r = await testLlmAction();
      return void (r.ok ? toast.success(r.message) : toast.error(`${r.error}.`));
    }
  }
}

function ActionButton({ action }: { action: SetupAction }) {
  const [pending, start] = useTransition();
  if (action.kind === "link") {
    return (
      <Button asChild variant="outline" size="sm">
        <a href={action.href} download={action.download}>
          {action.download && <Download />} {action.label}
        </a>
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => run(action.id))}>
      {pending && <Loader2 className="animate-spin" />} {action.label}
    </Button>
  );
}

function Row({ status, title, detail, children }: { status: CheckStatus; title: string; detail: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl border bg-card p-4">
      <StatusIcon status={status} className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="font-medium">{title}</h2>
          <span className="text-xs text-muted-foreground">{STATUS_LABEL[status]}</span>
        </div>
        <div className="text-sm text-muted-foreground">{detail}</div>
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
        <Button size="sm" onClick={() => void promptInstall()}>Install</Button>
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

export function SetupChecklistView({ items }: { items: SetupItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <Row key={item.id} status={item.status} title={item.title} detail={item.detail}>
          {item.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.actions.map((a) => (
                <ActionButton key={a.label} action={a} />
              ))}
            </div>
          )}
        </Row>
      ))}
      <InstallRow />
    </ul>
  );
}
