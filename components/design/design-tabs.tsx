import Link from "next/link";
import { Cpu, Database, Network, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: ReadonlyArray<{ id: "hld" | "os" | "dbms"; label: string; href: string; icon: LucideIcon }> = [
  { id: "hld", label: "System Design", href: "/design", icon: Network },
  { id: "os", label: "Operating Systems", href: "/design/os", icon: Cpu },
  { id: "dbms", label: "Databases", href: "/design/dbms", icon: Database },
];

export type DesignTabId = (typeof TABS)[number]["id"];

export function DesignTabs({ active }: { active: DesignTabId }) {
  return (
    <nav aria-label="Practice area" className="-mx-4 mb-6 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
      <div className="inline-flex min-w-max rounded-lg bg-muted p-[3px]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const current = t.id === active;
          return (
            <Link
              key={t.id}
              href={t.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                current ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
