"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Code2, ListChecks, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { NavBadges, NavToday } from "@/core/services/nav";
import { cn } from "@/core/utils";
import { MOBILE_HUB_IDS, NAV_HUBS, hubFor, isHubLanding, type NavHub } from "./nav-items";

export type Badge = NavBadges[keyof NavBadges];

export const badgeLabel = (b: Badge) => (b === true ? "ready" : b ? `${b}` : "");
const count = (n: number) => (n > 99 ? "99+" : String(n));

const matchesPath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** The badge for a page, from the nav state keyed by href. */
export const pageBadge = (badges: NavBadges, href: string): Badge => badges[href as keyof NavBadges];

/** A hub only ever shows a dot when any of its pages wants attention; counts live on the pages themselves. */
export function hubBadge(hub: NavHub, badges: NavBadges): Badge {
  return hub.pages.some((p) => pageBadge(badges, p.href)) ? true : undefined;
}

/** Thin bar under a nav link while its route is loading, so a slow click still feels acknowledged. */
export function PendingBar() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={cn("nav-pending", pending && "is-pending")} />;
}

export function BadgeMark({ badge }: { badge: Badge }) {
  if (badge === true) return <span aria-hidden className="ml-auto size-2 rounded-full bg-primary" />;
  if (typeof badge === "number")
    return (
      <span aria-hidden className="ml-auto rounded-full bg-primary/15 px-1.5 font-mono text-2xs leading-5 font-medium text-primary tabular-nums">
        {count(badge)}
      </span>
    );
  return null;
}

/** Mobile: the current hub's pages as a scrollable tab strip at the top of its landing pages. */
export function HubTabs({ badges = {} }: { badges?: NavBadges }) {
  const pathname = usePathname();
  const hub = hubFor(pathname);
  const strip = useRef<HTMLElement>(null);
  // The strip scrolls sideways, so bring the current page's tab into view (it can start off-screen).
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);
  if (!hub || hub.pages.length < 2 || !isHubLanding(pathname)) return null;
  const clean = pathname.replace(/\/$/, "");
  return (
    <nav ref={strip} aria-label={`${hub.label} sections`} className="-mx-4 mb-4 overflow-x-auto px-4 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-1.5">
        {hub.pages.map((p) => {
          const active = p.href === clean;
          const badge = pageBadge(badges, p.href);
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={active ? "page" : undefined}
                aria-label={badge ? `${p.label}, ${badgeLabel(badge)}` : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active ? "border-primary/40 bg-primary/10 font-medium text-primary" : "text-muted-foreground",
                )}
              >
                <p.icon className="size-4" aria-hidden />
                {p.label}
                {typeof badge === "number" ? (
                  <span aria-hidden className="rounded-full bg-primary/15 px-1.5 font-mono text-2xs leading-5 text-primary tabular-nums">{count(badge)}</span>
                ) : badge ? (
                  <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Today's targets as rows; empty outside the plan window. */
export function todayRows(today: NavToday | null) {
  if (!today || today.kind === "outside") return [];
  return (
    today.kind === "study" || today.kind === "revision"
      ? [
          { label: "DSA", icon: Code2, done: today.dsaSolved >= today.dsaTarget, value: `${today.dsaSolved}/${today.dsaTarget}`, href: "/dashboard#problems" },
          { label: "Theory", icon: BookOpen, done: today.theoryDone >= today.theoryTarget, value: `${today.theoryDone}/${today.theoryTarget}`, href: "/dashboard#theory" },
          {
            label: "Quiz",
            icon: ListChecks,
            done: today.quizPassed,
            value: today.quizPassed ? "passed" : today.quizUnlocked ? "open" : "locked",
            href: "/quiz",
          },
        ]
      : today.kind === "sunday"
        ? [{ label: "Weekly quiz", icon: ListChecks, done: today.quizPassed, value: today.quizPassed ? "passed" : "open", href: "/quiz" }]
        : []
  );
}

/** Compact view of today's targets, so progress is visible from every page. */
export function TodayMiniCard({ today }: { today: NavToday | null }) {
  if (!today || today.kind === "outside") return null;
  const rows = todayRows(today);
  const done = rows.filter((r) => r.done).length;

  return (
    <div className="rounded-xl border bg-card p-3 ring-1 ring-foreground/5">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium">Today</span>
        <span className={cn("font-mono tabular-nums", today.complete ? "text-success" : "text-muted-foreground")}>
          {today.kind === "rest" ? "rest day" : today.complete ? "complete" : `${done}/${rows.length}`}
        </span>
      </div>
      {rows.length > 0 && (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.label}>
              <Link href={r.href} className="flex items-center gap-2 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground">
                {r.done ? <Check className="size-3.5 text-success" aria-hidden /> : <r.icon className="size-3.5" aria-hidden />}
                <span className={cn("flex-1", r.done && "line-through")}>{r.label}</span>
                <span className="font-mono tabular-nums">{r.value}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MobileTabBar({
  badges = {},
  today = null,
  logout,
}: {
  badges?: NavBadges;
  today?: NavToday | null;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const tabs = MOBILE_HUB_IDS.flatMap((id) => NAV_HUBS.find((h) => h.id === id) ?? []);
  const more = NAV_HUBS.find((h) => h.id === "settings")!;
  const current = hubFor(pathname);
  const moreActive = current?.id === "settings";

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {tabs.map((hub) => {
          const badge = hubBadge(hub, badges);
          const active = current?.id === hub.id;
          return (
            <Link
              key={hub.id}
              href={hub.href}
              aria-current={active ? "page" : undefined}
              aria-label={badge ? `${hub.label}, ${badgeLabel(badge)}` : hub.label}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-2xs text-muted-foreground transition-colors active:scale-95",
                active && "text-primary",
              )}
            >
              {active && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
              <span className="relative">
                <hub.icon className="size-5" />
                {badge && <span aria-hidden className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary ring-2 ring-card" />}
              </span>
              {hub.short}
              <PendingBar />
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-2xs text-muted-foreground transition-colors active:scale-95",
            moreActive && "text-primary",
          )}
        >
          {moreActive && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
          <Menu className="size-5" />
          More
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl lg:hidden">
          <SheetHeader className="pb-0">
            <SheetTitle>More</SheetTitle>
            <SheetDescription className="sr-only">Settings, setup and sign out</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-4">
            <TodayMiniCard today={today} />
            <nav aria-label="Settings and setup" className="grid grid-cols-2 gap-1.5">
              {more.pages.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  onClick={() => setOpen(false)}
                  aria-current={matchesPath(pathname, p.href) ? "page" : undefined}
                  className="flex min-h-12 items-center gap-3 rounded-lg border bg-card px-3 text-sm hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <p.icon className="size-4 text-muted-foreground" aria-hidden /> {p.label}
                </Link>
              ))}
            </nav>
            <form action={logout} className="border-t pt-3">
              <button
                type="submit"
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Header context: the hub you are in. The page's own title lives in its PageHeader, so it is not repeated here. */
export function TopBarTitle() {
  const hub = hubFor(usePathname());
  if (!hub) return null;
  return (
    <span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium">
      <hub.icon className="size-4 shrink-0 text-primary lg:text-muted-foreground" aria-hidden />
      <span className="truncate">{hub.label}</span>
    </span>
  );
}
