import Link from "next/link";
import { chipClass } from "@/components/shared/chip";
import { cn } from "@/core/utils";

/** A filter chip rendered as a link (server-friendly, URL-driven filters). */
export function ChipLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={to} scroll={false} aria-current={active ? "true" : undefined} className={chipClass(active, "shrink-0")}>
      {children}
    </Link>
  );
}

/** Horizontally scrollable row of chips that wraps on large screens. */
export function ChipStrip({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <nav aria-label={label} className={cn("scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:flex-wrap lg:px-0", className)}>
      {children}
    </nav>
  );
}
