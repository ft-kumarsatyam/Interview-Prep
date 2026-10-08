import type { DesignCase } from "@/core/content";
import type { DesignStatus } from "@/modules/design/domain/design";

export const DESIGN_SHEET_KINDS = ["HLD", "LLD"] as const;
export type DesignSheetKind = (typeof DESIGN_SHEET_KINDS)[number];
export type DesignSheetLevel = "Easy" | "Medium" | "Hard";
export type DesignSheetStatus = "todo" | "in-progress" | "done";

export interface DesignSheetRow {
  id: string;
  title: string;
  kind: DesignSheetKind;
  level: DesignSheetLevel;
  /** Companies where candidates commonly report this question. */
  companies: string[];
  /** In-app page: the case workspace for HLD, the LLD topic notes for LLD. */
  href: string;
  article?: { label: string; url: string };
  video: string;
  status: DesignSheetStatus;
}

/** Commonly reported in interview experiences; a guide to where a question comes up, not a guarantee. */
const HLD_COMPANIES: Readonly<Record<string, readonly string[]>> = {
  "url-shortener": ["Google", "Amazon", "Microsoft", "Uber"],
  "key-value-store": ["Amazon", "Google", "LinkedIn"],
  "rate-limiter": ["Stripe", "Amazon", "Google", "Uber"],
  "unique-id-generator": ["X", "Amazon", "Uber"],
  "notification-system": ["Amazon", "Meta", "Uber", "Swiggy"],
  "news-feed": ["Meta", "X", "LinkedIn"],
  chat: ["Meta", "Microsoft", "Uber"],
  "video-streaming": ["Netflix", "Google", "Amazon"],
  "ride-hailing": ["Uber", "Ola Cabs", "Lyft", "Grab"],
  "payment-system": ["Stripe", "PayPal", "Razorpay", "PhonePe"],
  "ticket-booking": ["Amazon", "Flipkart", "Paytm"],
  "collaborative-docs": ["Google", "Microsoft", "Atlassian"],
  autocomplete: ["Google", "Amazon", "LinkedIn"],
  "web-crawler": ["Google", "Amazon", "Microsoft"],
  "file-sync": ["Dropbox", "Google", "Microsoft"],
  "ad-click-aggregator": ["Meta", "Google", "Amazon"],
  leaderboard: ["Amazon", "Dream11", "Roblox"],
  "nearby-friends": ["Meta", "Uber", "Swiggy"],
  "maps-navigation": ["Google", "Uber", "Apple"],
  "message-queue": ["LinkedIn", "Uber", "Confluent"],
  "metrics-monitoring": ["Datadog", "Google", "Amazon"],
  "email-service": ["Google", "Microsoft"],
  "object-storage": ["Amazon", "Google", "Microsoft"],
  "digital-wallet": ["PhonePe", "Paytm", "PayPal"],
  "stock-exchange": ["Citadel", "Goldman Sachs", "Jane Street"],
};

/** LLD questions, each pointing at the syllabus subtopic whose notes cover it. */
export const LLD_CASES: readonly { id: string; title: string; subtopic: string; level: DesignSheetLevel; companies: readonly string[] }[] = [
  { id: "parking-lot", title: "Parking Lot", subtopic: "lld-method:2", level: "Medium", companies: ["Amazon", "Microsoft", "Flipkart"] },
  { id: "elevator", title: "Elevator System", subtopic: "lld-method:3", level: "Hard", companies: ["Microsoft", "Amazon"] },
  { id: "lru-cache-lld", title: "LRU / LFU Cache", subtopic: "lld-cache-ratelimiter:0", level: "Medium", companies: ["Amazon", "Microsoft", "Google"] },
  { id: "rate-limiter-lld", title: "Rate Limiter (in-process)", subtopic: "lld-cache-ratelimiter:1", level: "Medium", companies: ["Uber", "Atlassian"] },
  { id: "bookmyshow-lld", title: "BookMyShow (seat booking)", subtopic: "lld-booking-splitwise:0", level: "Hard", companies: ["Flipkart", "Swiggy"] },
  { id: "splitwise", title: "Splitwise", subtopic: "lld-booking-splitwise:1", level: "Hard", companies: ["Flipkart", "PhonePe"] },
  { id: "snake-and-ladder", title: "Snake & Ladder / Tic-Tac-Toe", subtopic: "lld-games:0", level: "Easy", companies: ["Amazon", "Microsoft", "Swiggy"] },
  { id: "chess", title: "Chess (move validation)", subtopic: "lld-games:2", level: "Hard", companies: ["Google", "Microsoft"] },
  { id: "logger", title: "Logging Framework", subtopic: "lld-logger-pubsub:0", level: "Easy", companies: ["Atlassian", "Uber"] },
  { id: "pub-sub", title: "Pub-Sub / Message Broker", subtopic: "lld-logger-pubsub:1", level: "Medium", companies: ["Atlassian", "Flipkart"] },
  { id: "task-scheduler", title: "Task Scheduler", subtopic: "lld-logger-pubsub:2", level: "Medium", companies: ["Atlassian", "Uber"] },
  { id: "vending-machine", title: "Vending Machine / ATM", subtopic: "lld-vending-atm:0", level: "Medium", companies: ["Amazon", "Goldman Sachs"] },
  { id: "library-management", title: "Library Management System", subtopic: "lld-vending-atm:1", level: "Easy", companies: ["Amazon", "Adobe"] },
];

const videoSearch = (query: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

const DESIGN_DONE: Readonly<Record<DesignStatus, DesignSheetStatus>> = { new: "todo", studying: "in-progress", practised: "done", mastered: "done" };

/**
 * The system design sheet: every HLD case (status from its workspace) and the LLD questions (status from the
 * subtopic that covers them), HLD first.
 */
export function designSheetRows(
  cases: readonly DesignCase[],
  caseStatus: Readonly<Record<string, DesignStatus>>,
  doneSubtopics: ReadonlySet<string>,
): DesignSheetRow[] {
  const hld = cases.map<DesignSheetRow>((c) => {
    const name = c.title.replace(/\s*\(.*\)\s*$/, "");
    const reading = c.readings[0];
    return {
      id: c.slug,
      title: c.title,
      kind: "HLD",
      level: c.level === "advanced" ? "Hard" : "Medium",
      companies: [...(HLD_COMPANIES[c.slug] ?? [])],
      href: `/design/${c.slug}`,
      ...(reading ? { article: { label: reading.title, url: reading.url } } : {}),
      video: videoSearch(`system design ${name}`),
      status: DESIGN_DONE[caseStatus[c.slug] ?? "new"],
    };
  });
  const lld = LLD_CASES.map<DesignSheetRow>((c) => ({
    id: c.id,
    title: c.title,
    kind: "LLD",
    level: c.level,
    companies: [...c.companies],
    href: `/learn/${c.subtopic.split(":")[0]}`,
    video: videoSearch(`low level design ${c.title}`),
    status: doneSubtopics.has(c.subtopic) ? "done" : "todo",
  }));
  return [...hld, ...lld];
}
