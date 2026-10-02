import {
  BarChart3,
  BookOpen,
  Code2,
  LayoutDashboard,
  ListChecks,
  Network,
  Newspaper,
  RotateCcw,
  Settings,
  SquareTerminal,
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
  { href: "/review", label: "Review", icon: RotateCcw, group: "Today" },
  { href: "/dsa", label: "DSA", icon: Code2, group: "Practice", mobile: true },
  { href: "/playground", label: "JS Playground", icon: SquareTerminal, group: "Practice" },
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
