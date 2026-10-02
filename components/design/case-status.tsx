import { CircleCheck, CircleDashed, CircleDot, Trophy, type LucideIcon } from "lucide-react";
import type { DesignStatus } from "@/lib/domain/design";
import { cn } from "@/lib/utils";

export const STATUS_META: Record<DesignStatus, { label: string; text: string; badge: string; bar: string; icon: LucideIcon }> = {
  new: { label: "Not started", text: "text-muted-foreground", badge: "bg-muted", bar: "bg-muted-foreground/30", icon: CircleDashed },
  studying: { label: "Studying", text: "text-warning", badge: "bg-warning/12", bar: "bg-warning", icon: CircleDot },
  practised: { label: "Practised", text: "text-primary", badge: "bg-primary/12", bar: "bg-primary", icon: CircleCheck },
  mastered: { label: "Mastered", text: "text-success", badge: "bg-success/12", bar: "bg-success", icon: Trophy },
};

export function StatusBadge({ status, className }: { status: DesignStatus; className?: string }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", meta.badge, meta.text, className)}>
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </span>
  );
}
