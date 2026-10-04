import type { ReactNode } from "react";
import { cn } from "@/core/utils";

/** The page body below `PageHeader`: one vertical rhythm (`space-y-6`) for every top-level section. */
export function PageStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 space-y-6", className)}>{children}</div>;
}
