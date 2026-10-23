import Link from "next/link";
import { cn } from "@/core/utils";

/** Server tabs: only the active part is rendered by the page, so hidden mermaid trees never mount. */
export function PartTabs({
  parts,
  activeId,
  hrefFor,
}: {
  parts: Array<{ id: string; label: string }>;
  activeId: string;
  hrefFor: (id: string) => string;
}) {
  if (parts.length <= 1) return null;
  return (
    <nav aria-label="Lesson parts" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {parts.map((p) => (
        <Link
          key={p.id}
          href={hrefFor(p.id)}
          scroll={false}
          className={cn(
            "inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            p.id === activeId ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
          aria-current={p.id === activeId ? "page" : undefined}
        >
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
