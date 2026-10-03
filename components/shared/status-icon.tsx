import { AlertCircle, CheckCircle2, Circle, CircleDashed, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

/** Status as icon + colour + accessible label (never colour alone). */
export type StatusKind = "done" | "partial" | "warn" | "todo" | "idle";

const STATUS_ICON = {
  done: { Icon: CheckCircle2, tone: "text-success" },
  partial: { Icon: CircleDot, tone: "text-warning" },
  warn: { Icon: AlertCircle, tone: "text-warning" },
  todo: { Icon: Circle, tone: "text-muted-foreground" },
  idle: { Icon: CircleDashed, tone: "text-muted-foreground" },
} as const;

export function StatusIcon({ kind, label, className }: { kind: StatusKind; label: string; className?: string }) {
  const { Icon, tone } = STATUS_ICON[kind];
  return <Icon role="img" aria-label={label} className={cn("size-4 shrink-0", tone, className)} />;
}
