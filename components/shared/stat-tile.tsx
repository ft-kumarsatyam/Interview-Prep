import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Tone for an icon or value: one of the semantic tokens, never a raw colour. */
export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "streak";

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
  streak: "text-streak",
};

/**
 * One number with a label and an optional hint. Pass `children` for richer content below the value
 * (a progress bar, a split). Use `value={undefined}` with children for a labelled panel.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
  children,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value?: React.ReactNode;
  hint?: string;
  tone?: Tone;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card size="sm" className={cn("min-w-0", className)}>
      <CardContent className="flex h-full flex-col gap-1">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {Icon && <Icon className={cn("size-3.5 shrink-0", TONE_TEXT[tone])} aria-hidden />}
          <span className="truncate">{label}</span>
        </p>
        {value !== undefined && <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>}
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        {children}
      </CardContent>
    </Card>
  );
}
