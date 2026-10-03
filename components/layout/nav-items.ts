import {
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  CalendarRange,
  Code2,
  Database,
  LayoutDashboard,
  Library,
  ListChecks,
  Network,
  Newspaper,
  RotateCcw,
  Settings,
  SquareTerminal,
  Timer,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** One page inside a hub. */
export interface NavPage {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * A hub is one sidebar entry and one mobile tab. Its pages share a tab strip (mobile) or an expanded
 * sidebar list (desktop), so the app has 5 destinations instead of 17.
 */
export interface NavHub {
  id: "today" | "practice" | "learn" | "plan" | "settings";
  label: string;
  /** Label in the mobile tab bar, where width is tight. */
  short: string;
  icon: LucideIcon;
  /** Where the hub opens. */
  href: string;
  pages: NavPage[];
}

export const NAV_HUBS: NavHub[] = [
  {
    id: "today",
    label: "Today",
    short: "Today",
    icon: LayoutDashboard,
    href: "/dashboard",
    pages: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/quiz", label: "Daily quiz", icon: ListChecks },
      { href: "/review", label: "Review", icon: RotateCcw },
    ],
  },
  {
    id: "practice",
    label: "Practice",
    short: "Practice",
    icon: Code2,
    href: "/dsa",
    pages: [
      { href: "/dsa", label: "DSA", icon: Code2 },
      { href: "/problems", label: "Problems", icon: Library },
      { href: "/mock", label: "Mock interviews", icon: Timer },
      { href: "/aptitude", label: "Aptitude", icon: Brain },
      { href: "/playground", label: "Playground", icon: SquareTerminal },
      { href: "/playground/db", label: "DB Lab", icon: Database },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    short: "Learn",
    icon: BookOpen,
    href: "/learn",
    pages: [
      { href: "/learn", label: "Syllabus", icon: BookOpen },
      { href: "/design", label: "System Design", icon: Network },
      { href: "/news", label: "Reading", icon: Newspaper },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    short: "Plan",
    icon: CalendarRange,
    href: "/plan",
    pages: [
      { href: "/plan", label: "Planner", icon: CalendarRange },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/stats", label: "Stats", icon: BarChart3 },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    short: "More",
    icon: Settings,
    href: "/settings",
    pages: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/setup", label: "Setup", icon: Wrench },
    ],
  },
];

/** Hubs shown as mobile tabs. Settings lives behind the trailing "More" tab. */
export const MOBILE_HUB_IDS: NavHub["id"][] = ["today", "practice", "learn", "plan"];

/** Every page, flattened with its hub (used by the command palette). */
export const NAV_ITEMS: Array<NavPage & { hub: NavHub["id"] }> = NAV_HUBS.flatMap((h) => h.pages.map((p) => ({ ...p, hub: h.id })));

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** The page whose href is the longest prefix of `pathname`, so /playground/db is DB Lab, not Playground. */
export function pageFor(pathname: string): (NavPage & { hub: NavHub["id"] }) | undefined {
  return NAV_ITEMS.filter((p) => matches(pathname, p.href)).toSorted((a, b) => b.href.length - a.href.length)[0];
}

export function hubFor(pathname: string): NavHub | undefined {
  const page = pageFor(pathname);
  return page ? NAV_HUBS.find((h) => h.id === page.hub) : undefined;
}

/** True on a hub's own pages (not on a detail page like /dsa/two-sum), where the tab strip belongs. */
export function isHubLanding(pathname: string): boolean {
  const clean = pathname.replace(/\/$/, "") || "/";
  return NAV_ITEMS.some((p) => p.href === clean);
}
