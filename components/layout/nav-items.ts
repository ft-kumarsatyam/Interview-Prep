import {
  BarChart3,
  BookOpen,
  Code2,
  LayoutDashboard,
  ListChecks,
  Newspaper,
  RotateCcw,
  Settings,
  SquareTerminal,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom tab bar. */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/dsa", label: "DSA", icon: Code2, mobile: true },
  { href: "/review", label: "Review", icon: RotateCcw },
  { href: "/learn", label: "Learn", icon: BookOpen, mobile: true },
  { href: "/playground", label: "JS Playground", icon: SquareTerminal },
  { href: "/quiz", label: "Quiz", icon: ListChecks, mobile: true },
  { href: "/news", label: "News", icon: Newspaper, mobile: true },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/setup", label: "Setup", icon: Wrench },
];
