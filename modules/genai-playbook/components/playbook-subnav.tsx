"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/core/utils";

const LINKS = [
  { href: "/genai-playbook", label: "Overview", exact: true },
  { href: "/genai-playbook/today", label: "Today" },
  { href: "/genai-playbook/plan", label: "Plan" },
  { href: "/genai-playbook/reviews", label: "Reviews" },
] as const;

export function PlaybookSubnav() {
  const path = usePathname();
  return (
    <nav aria-label="GenAI playbook sections" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {LINKS.map(({ href, label, ...rest }) => {
        const exact = "exact" in rest && rest.exact;
        const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
