import {
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  CalendarRange,
  Code2,
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

export type NavGroup = "Today" | "Practice" | "Study" | "Stay sharp" | "App";

export interface NavItem {
  href: string;
  label: string;
  /** Label in the mobile tab bar, where width is tight. */
  short?: string;
  icon: LucideIcon;
  group: NavGroup;
  /** Shown in the mobile bottom tab bar; everything else lives behind "More". */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", short: "Today", icon: LayoutDashboard, group: "Today", mobile: true },
  { href: "/quiz", label: "Quiz", icon: ListChecks, group: "Today", mobile: true },
  { href: "/plan", label: "Planner", icon: CalendarRange, group: "Today" },
  { href: "/review", label: "Review", icon: RotateCcw, group: "Today" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, group: "Today" },
  { href: "/dsa", label: "DSA", icon: Code2, group: "Practice", mobile: true },
  { href: "/problems", label: "Problems", icon: Library, group: "Practice" },
  { href: "/mock", label: "Mock interviews", icon: Timer, group: "Practice" },
  { href: "/playground", label: "Playground", icon: SquareTerminal, group: "Practice" },
  { href: "/aptitude", label: "Aptitude", icon: Brain, group: "Practice" },
  { href: "/learn", label: "Learn", icon: BookOpen, group: "Study", mobile: true },
  { href: "/design", label: "System Design", icon: Network, group: "Study" },
  { href: "/news", label: "News", icon: Newspaper, group: "Stay sharp" },
  { href: "/stats", label: "Stats", icon: BarChart3, group: "Stay sharp" },
  { href: "/settings", label: "Settings", icon: Settings, group: "App" },
  { href: "/setup", label: "Setup", icon: Wrench, group: "App" },
];

export const NAV_GROUPS: NavGroup[] = ["Today", "Practice", "Study", "Stay sharp", "App"];

/** Order of the mobile tab bar (before the trailing "More" tab). */
export const MOBILE_TABS = ["/dashboard", "/dsa", "/learn", "/quiz"];

export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
}
