"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, Check, Code2, ListChecks, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { NavBadges, NavToday } from "@/lib/services/nav";
import { cn } from "@/lib/utils";
import { MOBILE_TABS, NAV_GROUPS, NAV_ITEMS, navItemFor, type NavItem } from "./nav-items";

type Badge = NavBadges[keyof NavBadges];

const badgeLabel = (b: Badge) => (b === true ? "ready" : b ? `${b}` : "");
const count = (n: number) => (n > 99 ? "99+" : String(n));

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Thin bar under a nav link while its route is loading, so a slow click still feels acknowledged. */
function PendingBar() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={cn("nav-pending", pending && "is-pending")} />;
}

function BadgeMark({ badge }: { badge: Badge }) {
  if (badge === true) return <span aria-hidden className="ml-auto size-2 rounded-full bg-primary" />;
  if (typeof badge === "number")
    return (
      <span aria-hidden className="ml-auto rounded-full bg-primary/15 px-1.5 font-mono text-[11px] leading-5 font-medium text-primary tabular-nums">
        {count(badge)}
      </span>
    );
  return null;
}

function NavLink({
  item,
  badge,
  active,
  onNavigate,
  tile,
}: {
  item: NavItem;
  badge: Badge;
  active: boolean;
  onNavigate?: () => void;
  tile?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={badge ? `${item.label}, ${badgeLabel(badge)}` : undefined}
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
        tile && "border bg-card py-3",
        active && "bg-sidebar-accent font-medium text-foreground",
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />}
      <Icon className={cn("size-4", active && "text-primary")} />
      {item.label}
      <BadgeMark badge={badge} />
      <PendingBar />
    </Link>
  );
}

function GroupedNav({ badges, onNavigate, tiles }: { badges: NavBadges; onNavigate?: () => void; tiles?: boolean }) {
  const isActive = useIsActive();
  return (
    <nav aria-label="Main" className={cn("flex flex-col", tiles ? "gap-3" : "gap-4")}>
      {NAV_GROUPS.map((group) => (
        <div key={group} className={cn(tiles ? "grid grid-cols-2 gap-1.5" : "flex flex-col gap-0.5")}>
          <p className={cn("px-3 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground/70 uppercase", tiles && "col-span-2 px-1 pb-0")}>{group}</p>
          {NAV_ITEMS.filter((i) => i.group === group).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              badge={badges[item.href as keyof NavBadges]}
              active={isActive(item.href)}
              onNavigate={onNavigate}
              tile={tiles}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

export function SidebarNav({ badges = {} }: { badges?: NavBadges }) {
  return <GroupedNav badges={badges} />;
}

/** Compact view of today's targets, so progress is visible from every page. */
export function TodayMiniCard({ today }: { today: NavToday | null }) {
  if (!today || today.kind === "outside") return null;
  const rows =
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
        : [];
  const done = rows.filter((r) => r.done).length;

  return (
    <div className="rounded-xl border bg-card p-3 ring-1 ring-white/5">
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
  const isActive = useIsActive();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const tabs = MOBILE_TABS.flatMap((href) => NAV_ITEMS.find((i) => i.href === href) ?? []);
  const current = navItemFor(pathname);
  const moreActive = !!current && !MOBILE_TABS.includes(current.href);
  const moreBadge = NAV_ITEMS.some((i) => !MOBILE_TABS.includes(i.href) && badges[i.href as keyof NavBadges]);

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {tabs.map((item) => {
          const badge = badges[item.href as keyof NavBadges];
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={badge ? `${item.label}, ${badgeLabel(badge)}` : item.label}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground transition-colors active:scale-95",
                active && "text-primary",
              )}
            >
              {active && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
              <span className="relative">
                <item.icon className="size-5" />
                {badge && <span aria-hidden className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary ring-2 ring-card" />}
              </span>
              {item.short ?? item.label}
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
            "relative flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground transition-colors active:scale-95",
            moreActive && "text-primary",
          )}
        >
          {moreActive && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
          <span className="relative">
            <Menu className="size-5" />
            {moreBadge && <span aria-hidden className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary ring-2 ring-card" />}
          </span>
          More
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl lg:hidden">
          <SheetHeader className="pb-0">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">Every page in PrepOS</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-4">
            <TodayMiniCard today={today} />
            <GroupedNav tiles badges={badges} onNavigate={() => setOpen(false)} />
            <form action={logout} className="border-t pt-3">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
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

/** Current page name for the top bar. */
export function TopBarTitle() {
  const item = navItemFor(usePathname());
  if (!item) return null;
  return (
    <span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium">
      <item.icon className="size-4 shrink-0 text-primary lg:text-muted-foreground" aria-hidden />
      <span className="truncate">{item.label}</span>
    </span>
  );
}
