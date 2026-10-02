"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavBadges } from "@/lib/services/nav";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

type Badge = NavBadges[keyof NavBadges];

const badgeLabel = (b: Badge) => (b === true ? "ready" : b ? `${b}` : "");
const count = (n: number) => (n > 99 ? "99+" : String(n));

export function SidebarNav({ badges = {} }: { badges?: NavBadges }) {
  const isActive = useIsActive();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const badge = badges[href as keyof NavBadges];
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            aria-label={badge ? `${label}, ${badgeLabel(badge)}` : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
              isActive(href) && "bg-sidebar-accent font-medium text-foreground",
            )}
          >
            <Icon className={cn("size-4", isActive(href) && "text-primary")} />
            {label}
            {badge === true && <span aria-hidden className="ml-auto size-2 rounded-full bg-primary" />}
            {typeof badge === "number" && (
              <span aria-hidden className="ml-auto rounded-full bg-muted px-1.5 font-mono text-[11px] leading-5 text-muted-foreground tabular-nums">
                {count(badge)}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTabBar({ badges = {} }: { badges?: NavBadges }) {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {NAV_ITEMS.filter((i) => i.mobile).map(({ href, label, icon: Icon }) => {
        const badge = badges[href as keyof NavBadges];
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            aria-label={badge ? `${label}, ${badgeLabel(badge)}` : undefined}
            className={cn("flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground", isActive(href) && "text-primary")}
          >
            <span className="relative">
              <Icon className="size-5" />
              {badge && <span aria-hidden className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary ring-2 ring-card" />}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
