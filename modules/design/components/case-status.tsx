import { CircleCheck, CircleDashed, CircleDot, Trophy, type LucideIcon } from "lucide-react";
import type { DesignStatus } from "@/modules/design/domain/design";
import { ToneBadge } from "@/components/shared/tone-badge";
import type { Tone } from "@/components/shared/stat-tile";

export const STATUS_META: Record<DesignStatus, { label: string; text: string; badge: string; bar: string; icon: LucideIcon }> = {
  new: { label: "Not started", text: "text-muted-foreground", badge: "bg-muted", bar: "bg-muted-foreground/30", icon: CircleDashed },
  studying: { label: "Studying", text: "text-warning", badge: "bg-warning/12", bar: "bg-warning", icon: CircleDot },
  practised: { label: "Practised", text: "text-primary", badge: "bg-primary/12", bar: "bg-primary", icon: CircleCheck },
  mastered: { label: "Mastered", text: "text-success", badge: "bg-success/12", bar: "bg-success", icon: Trophy },
};

const STATUS_TONE: Record<DesignStatus, Tone> = { new: "neutral", studying: "warning", practised: "primary", mastered: "success" };

export function StatusBadge({ status, className }: { status: DesignStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <ToneBadge tone={STATUS_TONE[status]} icon={meta.icon} className={className}>
      {meta.label}
    </ToneBadge>
  );
}
