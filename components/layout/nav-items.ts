import {
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  CalendarDays,
  Briefcase,
  CalendarRange,
  Code2,
  Database,
  Dumbbell,
  Globe,
  Hammer,
  Headphones,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageCircleQuestion,
  Network,
  PenLine,
  Route,
  Sparkles,
  StickyNote,
  Newspaper,
  RotateCcw,
  Settings,
  SquareTerminal,
  Target,
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
 * sidebar list (desktop), so the app has 6 destinations instead of 30. Order follows a study day:
 * what to do today, how the plan is going, then practice, learning and the job search.
 */
export interface NavHub {
  id: "today" | "plan" | "practice" | "learn" | "career" | "settings";
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
      { href: "/backlog", label: "Backlog", icon: Inbox },
      { href: "/chat", label: "Assistant", icon: Bot },
      { href: "/fun", label: "Break room", icon: Sparkles },
      { href: "/music", label: "Music dock", icon: Headphones },
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
      { href: "/targets", label: "Targets", icon: Target },
      { href: "/stats", label: "Stats", icon: BarChart3 },
      { href: "/focus", label: "Focus history", icon: Timer },
    ],
  },
  {
    id: "practice",
    label: "Practice",
    short: "Practice",
    icon: Code2,
    href: "/dsa",
    pages: [
      { href: "/practice", label: "Practice hub", icon: Dumbbell },
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
      { href: "/courses", label: "Courses", icon: GraduationCap },
      { href: "/roadmaps", label: "Roadmaps", icon: Route },
      { href: "/design", label: "System Design", icon: Network },
      { href: "/web", label: "Web & AI", icon: Globe },
      { href: "/web/interview", label: "Interview bank", icon: MessageCircleQuestion },
      { href: "/interview-bank", label: "All questions", icon: MessageCircleQuestion },
      { href: "/projects", label: "Projects", icon: Hammer },
      { href: "/blogs", label: "Eng blogs", icon: PenLine },
      { href: "/ask", label: "Ask notes", icon: Sparkles },
      { href: "/notes", label: "Notes inbox", icon: StickyNote },
      { href: "/news", label: "Reading", icon: Newspaper },
    ],
  },
  {
    id: "career",
    label: "Career",
    short: "Career",
    icon: Briefcase,
    href: "/jobs",
    pages: [
      { href: "/jobs", label: "Jobs", icon: Briefcase },
      { href: "/resume", label: "Resume", icon: FileText },
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

/** Hubs shown as mobile tabs. Career and Settings live behind the trailing "More" tab. */
export const MOBILE_HUB_IDS: NavHub["id"][] = ["today", "plan", "practice", "learn"];

/** Hubs reached through the mobile "More" sheet, in order. */
export const MORE_HUB_IDS: NavHub["id"][] = ["career", "settings"];

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

/** Cookie holding "collapsed" when the desktop sidebar is an icon rail; read on the server so the first paint is right. */
export const SIDEBAR_COOKIE = "prepos-sidebar";
/** localStorage key (under the `prepos:` prefix) for hubs the user expanded by hand. */
export const OPEN_HUBS_KEY = "nav:open-hubs";

const HUB_IDS = new Set<string>(NAV_HUBS.map((h) => h.id));

/** Stored expanded hubs, keeping only known ids. Garbage, old formats or a missing value give an empty list. */
export function parseOpenHubs(raw: string | null | undefined): NavHub["id"][] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((v): v is NavHub["id"] => typeof v === "string" && HUB_IDS.has(v)))];
  } catch {
    return [];
  }
}

/** Add or remove a hub from the expanded list, in the sidebar's order. */
export function toggleHub(open: readonly NavHub["id"][], id: NavHub["id"]): NavHub["id"][] {
  const next = new Set(open);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return NAV_HUBS.map((h) => h.id).filter((h) => next.has(h));
}

/** True on a hub's own pages (not on a detail page like /dsa/two-sum), where the tab strip belongs. */
export function isHubLanding(pathname: string): boolean {
  const clean = pathname.replace(/\/$/, "") || "/";
  return NAV_ITEMS.some((p) => p.href === clean);
}
