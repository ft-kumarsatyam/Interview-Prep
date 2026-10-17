import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/core/utils";

/**
 * A collapsed-by-default disclosure for exploratory dashboard sections. Plain
 * <details>, so it works without JavaScript and by keyboard (see WhyThisPlan).
 */
export function CollapsibleSection({
  title,
  badge,
  defaultOpen,
  children,
  className,
}: {
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group", className)} open={defaultOpen}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          {title}
          {badge}
        </span>
        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
