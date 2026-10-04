"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useReducer, useState } from "react";
import { Check, ChevronDown, Flame, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { readPref, useHydrated, writePref } from "@/modules/dsa/components/ide/use-client-prefs";
import { useModKey } from "@/modules/dsa/components/playground/use-mod-key";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NavBadges, NavToday } from "@/core/services/nav";
import { cn } from "@/core/utils";
import { BadgeMark, PendingBar, TodayMiniCard, badgeLabel, hubBadge, pageBadge, todayRows, type Badge } from "./app-nav";
import { NAV_HUBS, OPEN_HUBS_KEY, SIDEBAR_COOKIE, hubFor, pageFor, parseOpenHubs, toggleHub, type NavHub, type NavPage } from "./nav-items";

const YEAR_S = 60 * 60 * 24 * 365;
const focusRing = "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function SubLink({ page, badge, active }: { page: NavPage; badge: Badge; active: boolean }) {
  return (
    <Link
      href={page.href}
      aria-current={active ? "page" : undefined}
      aria-label={badge ? `${page.label}, ${badgeLabel(badge)}` : undefined}
      className={cn(
        "relative flex min-h-9 items-center gap-2.5 overflow-hidden rounded-md py-1.5 pr-3 pl-9 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
        focusRing,
        active && "bg-sidebar-accent font-medium text-foreground",
      )}
    >
      <page.icon className={cn("size-3.5 shrink-0", active && "text-primary")} aria-hidden />
      <span className="truncate">{page.label}</span>
      <BadgeMark badge={badge} />
      <PendingBar />
    </Link>
  );
}

/** Expanded sidebar row: the hub link plus its own expand button, so any hub can be opened without leaving the page. */
function HubSection({
  hub,
  badges,
  inHub,
  open,
  activeHref,
  onToggle,
}: {
  hub: NavHub;
  badges: NavBadges;
  inHub: boolean;
  open: boolean;
  activeHref: string | undefined;
  onToggle: () => void;
}) {
  const badge = hubBadge(hub, badges);
  const nested = hub.pages.length > 1;
  const listId = `nav-hub-${hub.id}`;
  return (
    <li>
      <div className="relative">
        <Link
          href={hub.href}
          aria-current={inHub && activeHref === hub.href && !nested ? "page" : undefined}
          aria-label={badge && !open ? `${hub.label}, ${badgeLabel(badge)}` : undefined}
          className={cn(
            "relative flex min-h-10 items-center gap-3 overflow-hidden rounded-lg py-2 pl-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
            nested ? "pr-11" : "pr-3",
            focusRing,
            inHub && "font-medium text-foreground",
          )}
        >
          {inHub && <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />}
          <hub.icon className={cn("size-4 shrink-0", inHub && "text-primary")} aria-hidden />
          <span className="truncate">{hub.label}</span>
          {!open && <BadgeMark badge={badge} />}
          <PendingBar />
        </Link>
        {nested && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={listId}
            aria-label={`${open ? "Collapse" : "Expand"} ${hub.label}`}
            className={cn(
              "absolute inset-y-1 right-1 grid w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
              focusRing,
            )}
          >
            <ChevronDown aria-hidden className={cn("size-3.5 transition-transform motion-reduce:transition-none", !open && "-rotate-90")} />
          </button>
        )}
      </div>
      {nested && open && (
        <ul id={listId} className="mt-0.5 mb-1 flex flex-col gap-0.5">
          {hub.pages.map((page) => (
            <li key={page.href}>
              <SubLink page={page} badge={pageBadge(badges, page.href)} active={activeHref === page.href} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Icon-rail entry: hover names the hub, click opens its pages in a flyout. */
function RailHub({ hub, badges, inHub, activeHref }: { hub: NavHub; badges: NavBadges; inHub: boolean; activeHref: string | undefined }) {
  const badge = hubBadge(hub, badges);
  const label = badge ? `${hub.label}, ${badgeLabel(badge)}` : hub.label;
  const iconClass = cn(
    "relative grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground data-[state=open]:bg-sidebar-accent",
    focusRing,
    inHub && "bg-sidebar-accent text-primary",
  );
  const mark = (
    <>
      <hub.icon className="size-[18px]" aria-hidden />
      {badge && <span aria-hidden className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-sidebar" />}
    </>
  );

  if (hub.pages.length < 2) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={hub.href} aria-label={label} aria-current={inHub ? "page" : undefined} className={iconClass}>
              {mark}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{hub.label}</TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return (
    <li>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger aria-label={label} className={iconClass}>
              {mark}
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{hub.label}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">{hub.label}</DropdownMenuLabel>
          {hub.pages.map((page) => {
            const active = activeHref === page.href;
            return (
              <DropdownMenuItem key={page.href} asChild className={cn("min-h-9", active && "font-medium text-primary")}>
                <Link href={page.href} aria-current={active ? "page" : undefined}>
                  <page.icon aria-hidden />
                  <span className="flex-1 truncate">{page.label}</span>
                  <BadgeMark badge={pageBadge(badges, page.href)} />
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function RailToday({ today }: { today: NavToday | null }) {
  const rows = todayRows(today);
  if (!today || rows.length === 0) return null;
  const done = rows.filter((r) => r.done).length;
  const text = today.complete ? "Today complete" : `Today: ${done} of ${rows.length} done`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/dashboard"
          aria-label={text}
          className={cn(
            "grid size-10 place-items-center rounded-lg border bg-card font-mono text-2xs tabular-nums",
            focusRing,
            today.complete ? "border-success/40 text-success" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {today.complete ? <Check className="size-4" aria-hidden /> : `${done}/${rows.length}`}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{text}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Desktop sidebar. Expanded (240px): every hub can be opened on its own, the current hub opens by itself and
 * hand-opened hubs are remembered on this device. Collapsed (64px icon rail, ⌘/Ctrl + B): hubs open as flyouts.
 * The collapsed state lives in a cookie so the server renders the right width on the first paint.
 */
export function AppSidebar({
  badges = {},
  today = null,
  initialCollapsed,
  logout,
}: {
  badges?: NavBadges;
  today?: NavToday | null;
  initialCollapsed: boolean;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const activeHub = hubFor(pathname);
  const activeHref = pageFor(pathname)?.href;
  const modKey = useModKey();
  const hydrated = useHydrated();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  // The page where the user folded the current hub; it reopens once they navigate elsewhere.
  const [foldedAt, setFoldedAt] = useState<string | null>(null);

  const pinned = hydrated ? parseOpenHubs(readPref(OPEN_HUBS_KEY)) : [];
  const isOpen = (hub: NavHub) => (hub.id === activeHub?.id ? foldedAt !== pathname : pinned.includes(hub.id));

  function savePinned(next: NavHub["id"][]) {
    writePref(OPEN_HUBS_KEY, next.length ? JSON.stringify(next) : null);
    rerender();
  }

  function toggle(hub: NavHub) {
    if (hub.id !== activeHub?.id) return savePinned(toggleHub(pinned, hub.id));
    if (isOpen(hub)) {
      setFoldedAt(pathname);
      if (pinned.includes(hub.id)) savePinned(toggleHub(pinned, hub.id));
    } else setFoldedAt(null);
  }

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=${YEAR_S}; samesite=lax`;
  }, [collapsed]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "b" || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      e.preventDefault();
      toggleCollapsed();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  const toggleLabel = `${collapsed ? "Expand" : "Collapse"} sidebar (${modKey} + B)`;
  const toggleButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={toggleLabel}
          aria-pressed={collapsed}
          className={cn("grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground", focusRing)}
        >
          {collapsed ? <PanelLeftOpen className="size-4" aria-hidden /> : <PanelLeftClose className="size-4" aria-hidden />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{toggleLabel}</TooltipContent>
    </Tooltip>
  );

  return (
    <aside
      data-collapsed={collapsed}
      aria-label="Sidebar"
      className={cn(
        "sticky top-0 hidden h-dvh flex-col gap-4 overflow-x-hidden overflow-y-auto border-r bg-sidebar lg:flex [scrollbar-width:thin]",
        collapsed ? "items-center px-3 py-4" : "p-4",
      )}
    >
      <Link
        href="/dashboard"
        aria-label={collapsed ? "PrepOS home" : undefined}
        className={cn("flex items-center gap-2 rounded-lg text-lg font-semibold", focusRing, !collapsed && "px-2")}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Flame className="size-4" aria-hidden />
        </span>
        {!collapsed && "PrepOS"}
      </Link>

      <nav aria-label="Main" className={cn(collapsed && "w-full")}>
        <ul className={cn("flex flex-col", collapsed ? "items-center gap-1.5" : "gap-1")}>
          {NAV_HUBS.map((hub) =>
            collapsed ? (
              <RailHub key={hub.id} hub={hub} badges={badges} inHub={activeHub?.id === hub.id} activeHref={activeHref} />
            ) : (
              <HubSection
                key={hub.id}
                hub={hub}
                badges={badges}
                inHub={activeHub?.id === hub.id}
                open={isOpen(hub)}
                activeHref={activeHref}
                onToggle={() => toggle(hub)}
              />
            ),
          )}
        </ul>
      </nav>

      <div className={cn("mt-auto flex flex-col gap-2", collapsed && "items-center")}>
        {collapsed ? <RailToday today={today} /> : <TodayMiniCard today={today} />}
        <div className={cn("flex gap-1", collapsed ? "flex-col items-center" : "items-center")}>
          <form action={logout} className={cn(!collapsed && "flex-1")}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="submit"
                    aria-label="Sign out"
                    className={cn("grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground", focusRing)}
                  >
                    <LogOut className="size-4" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            ) : (
              <button
                type="submit"
                className={cn("flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground", focusRing)}
              >
                <LogOut className="size-4" aria-hidden /> Sign out
              </button>
            )}
          </form>
          {toggleButton}
        </div>
      </div>
    </aside>
  );
}
