import { cn } from "@/lib/utils";
import type { Tone } from "./stat-tile";

const TONE_BADGE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  streak: "bg-streak/10 text-streak",
};

/** A small status pill. Colour is never the only signal: pass an icon or make the text say the status. */
export function ToneBadge({ tone = "neutral", icon: Icon, children, className }: { tone?: Tone; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", TONE_BADGE[tone], className)}>
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}
