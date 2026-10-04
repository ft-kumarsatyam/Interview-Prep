import type { MailSpec } from "./mail-html";
import { escapeHtml } from "./html";

/**
 * "Roast mode": desi tough-love one-liners that lead the morning / evening
 * emails and Telegram messages. Opt-out in Settings → Notification channels.
 * `{name}` becomes ADMIN_NAME.
 */
export type RoastSlot = "morning" | "evening" | "done" | "rest" | "weekly";

export const ROAST_LINES: Record<RoastSlot, readonly string[]> = {
  morning: [
    "Aaj toh padhle bosdike!",
    "Tujhe switch krna hai bhi ya nhi {name}?",
    "Paise chahiye ya nhi chutiye?",
    "Abe gand mare aaj padhlio please!",
    "Uth ja lawde, LeetCode tera baap solve nahi karega!",
    "Reels baad me, pehle DSA kar bsdk!",
    "{name}, Google wale tera wait nahi kar rahe. Chal padh!",
    "Sapne 40 LPA ke, harkatein 4 LPA wali. Padh le chutiye!",
    "Chai pi, phone side me rakh, aur padh le nalle!",
    "Plan ready hai, bas tu ready ho ja lawde!",
    "Interview tera intezaar kar raha hai, aur tu so raha hai bosdike?",
    "Aaj bhi bahana banayega ya padhega {name}?",
    "Same company me sadna hai kya? Padh le bsdk!",
    "HR call aayega tab yaad aayega? Abhi padh le lawde!",
  ],
  evening: [
    "Ab kab padhega lawde?",
    "Tujhse nhi ho payega bhai!",
    "Tu lodu hai kya thoda?",
    "Din khatam, kaam baaki. Sharam aayi ya nahi {name}?",
    "Aaj bhi kal pe taal diya na chutiye?",
    "Streak tod ke khush hai bosdike?",
    "Netflix khatam hua? Ab quiz de de lawde!",
    "Raat ho gayi, quiz abhi bhi pending hai nalle!",
    "Switch karega ya isi company me sadega {name}?",
    "Itna hi padhna tha toh plan kyu banaya bsdk?",
    "Recap dekh, aur thoda sharminda ho le chutiye.",
    "Sone se pehle ek problem toh kar le lawde!",
  ],
  done: [
    "Aaj toh faad diya {name}! Kal bhi aise hi.",
    "Shabaash bosdike, aaj ka kaam khatam!",
    "Dekha? Ho sakta hai tujhse. Kal bhi karna lawde!",
    "Streak zinda hai, tu bhi. Shabaash {name}!",
    "Aaj tu lodu nahi nikla. Proud of you bsdk!",
    "Paise aa rahe hain, mehnat dikh rahi hai. Keep going!",
  ],
  rest: [
    "Aaj chhutti hai, enjoy kar. Kal se phir ghis {name}!",
    "Rest day hai lawde, so ja. Kal padhna padega!",
    "Aaj aaram kar, kal LeetCode tera intezaar karega.",
  ],
  weekly: [
    "Hafta khatam, ab scorecard dekh {name}!",
    "Ek hafta aur gaya, kuch kiya ya sirf scroll kiya bsdk?",
    "Weekly report aa gayi, sach dekh aur agle hafte sudhar ja lawde.",
  ],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Same line for the same date and slot (so a retried job doesn't change it), a new one each day. */
export function pickRoast(slot: RoastSlot, seed: string, name: string): string {
  const lines = ROAST_LINES[slot];
  const line = lines[hash(`${slot}:${seed}`) % lines.length];
  return line.replaceAll("{name}", name);
}

export interface PushContent {
  title: string;
  body: string;
  html?: string;
  /** The structured message behind `html`, for the PWA's push and message page. */
  spec?: MailSpec;
  /** The roast line on its own, so a short push can lead with it instead of a long subject. */
  roast?: string;
}

/** The roast line becomes the subject and leads the body; the original title follows it. */
export function withRoast(content: PushContent, line: string): PushContent {
  const banner = `<p style="margin:0 0 16px;padding:12px 16px;border-radius:10px;background:#1f1633;color:#c4b5fd;font:600 18px/1.4 system-ui,-apple-system,Segoe UI,sans-serif">${escapeHtml(line)}</p>`;
  return {
    title: `${line} | ${content.title}`,
    body: `${line}\n\n${content.body}`,
    ...(content.html !== undefined ? { html: `${banner}${content.html}` } : {}),
    ...(content.spec ? { spec: content.spec } : {}),
    roast: line,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Context-aware roasts. The line is chosen from what is actually true today (backlog, streak, what is
 * left, how the week went), at the intensity you picked in Settings. Pure and deterministic per seed.
 * ---------------------------------------------------------------------------------------------- */

export const ROAST_LEVELS = ["off", "coach", "savage"] as const;
export type RoastLevel = (typeof ROAST_LEVELS)[number];

export const ROAST_LEVEL_LABEL: Record<RoastLevel, string> = { off: "Off", coach: "Coach", savage: "Savage" };
export const ROAST_LEVEL_HINT: Record<RoastLevel, string> = {
  off: "Plain emails, no commentary.",
  coach: "Firm and encouraging, in plain English, using your real numbers.",
  savage: "Desi tough love with your real numbers. Includes strong language.",
};

/** `roastLevel` wins; older settings only have the on/off `roastMode`, which meant savage. */
export function effectiveRoastLevel(roastLevel: RoastLevel | null | undefined, roastMode: boolean | null | undefined): RoastLevel {
  if (roastLevel && (ROAST_LEVELS as readonly string[]).includes(roastLevel)) return roastLevel;
  return roastMode === false ? "off" : "savage";
}

export interface RoastContext {
  streak?: number;
  /** Items owed beyond today's targets (see lib/domain/backlog.ts). */
  backlog?: number;
  /** Items still open today. */
  left?: number;
  /** Share of today's items finished, 0-100. */
  pct?: number;
  solved?: number;
  daysLeft?: number;
  /** Only the quiz is left. */
  quizOnly?: boolean;
  /** The streak reset today. */
  streakBroken?: boolean;
  /** Share of the week's targets hit, 0-100. */
  weekPct?: number;
}

const HEAVY_BACKLOG = 15;
const CLOSE_INTERVIEW_DAYS = 30;
const LONG_STREAK = 7;

/** The one situation that best describes the moment; each slot has its own set. */
export function roastSituation(slot: RoastSlot, c: RoastContext): string | null {
  switch (slot) {
    case "morning":
      if ((c.backlog ?? 0) >= HEAVY_BACKLOG) return "backlog-heavy";
      if ((c.backlog ?? 0) > 0) return "backlog";
      if (c.daysLeft !== undefined && c.daysLeft <= CLOSE_INTERVIEW_DAYS) return "interview-close";
      if ((c.streak ?? 0) >= LONG_STREAK) return "streak-long";
      return c.backlog === 0 ? "clean" : null;
    case "evening":
      if (c.quizOnly) return "quiz-only";
      if (c.pct === 0) return "zero";
      if ((c.pct ?? 0) >= 60) return "almost";
      return c.left !== undefined ? "some" : null;
    case "done":
      return "done";
    case "weekly":
      if (c.weekPct === undefined) return null;
      return c.weekPct >= 90 ? "great" : c.weekPct >= 60 ? "ok" : c.weekPct > 0 ? "poor" : "zero";
    default:
      return null;
  }
}

type Pool = Partial<Record<string, readonly string[]>>;

/** Night recap needs its own situations, keyed separately because "evening" is the mid-evening nudge. */
const NIGHT_SITUATION = (c: RoastContext): string => (c.streakBroken ? "streak-broken" : c.pct === 0 ? "zero" : (c.pct ?? 100) >= 100 ? "done" : "partial");

const COACH: Record<string, Pool> = {
  morning: {
    "backlog-heavy": [
      "{backlog} items are behind plan. Today we start closing the gap instead of admiring it.",
      "The backlog is {backlog} deep, {name}. One focused block this morning, then another. That is how it shrinks.",
      "You owe yourself {backlog} items. Pay a little today so it doesn't compound.",
    ],
    backlog: [
      "{backlog} left over from earlier days. Clear a couple today and you are back on pace.",
      "A small backlog ({backlog}) is easy to clear now and painful in a month. Start with the oldest.",
      "Before anything new, take one item off the {backlog} that are waiting.",
    ],
    "interview-close": ["{daysLeft} days to the interview. Every session counts now, {name}.", "Under a month to go ({daysLeft} days). Protect your study blocks."],
    "streak-long": ["{streak} days in a row. Protect it: do the hard thing first today.", "Day {streak} of showing up. Keep the chain unbroken."],
    clean: ["Nothing overdue. Keep it that way: finish today's targets early.", "A clean slate. Don't let today become tomorrow's backlog."],
    _: ["Good morning {name}. The plan is ready; start with the first item and the rest follows.", "Small, steady sessions beat heroic weekends. Begin.", "You don't need motivation, you need the first ten minutes. Open the first problem."],
  },
  evening: {
    "quiz-only": ["Only the quiz stands between you and a finished day. Ten minutes.", "Everything else is done. Take the quiz and close the day."],
    almost: ["{left} left and you are {pct}% through. Finish it tonight.", "So close, {name}. {left} more and the day is complete."],
    zero: ["Nothing logged yet today. One problem is enough to start; the rest follows.", "The day isn't over. Pick the smallest item and do it now."],
    some: ["{left} items still open. A short push now keeps your streak ({streak}) alive.", "{left} to go. Do the quick one first."],
    _: ["Evening check-in: what is still open today? Do one thing before bed.", "There's still time tonight. One item, then done."],
  },
  night: {
    done: ["Day closed. {solved} solved, streak at {streak}. Rest well.", "Everything done today. That is how streaks are built."],
    partial: ["{pct}% of today is done. Tomorrow's plan absorbs the rest, but it will feel heavier.", "Partly done ({pct}%). Make the first task tomorrow small and certain."],
    zero: ["No progress today. It happens. Reset tonight and make tomorrow's first task small.", "A blank day. Don't chase it: start fresh in the morning."],
    "streak-broken": ["The streak reset today. Day one starts again tomorrow, and it only takes one session.", "Streaks break; what matters is the restart. Tomorrow, one session."],
    _: ["That's the day. Review what's left and sleep on it."],
  },
  rest: { _: ["Rest day. Recover; tomorrow's plan is ready.", "Rest is part of the plan. Back tomorrow."] },
  weekly: {
    great: ["A strong week: {weekPct}% of targets hit. Keep this rhythm.", "{weekPct}% this week. Repeat it."],
    ok: ["Solid week ({weekPct}%). One more session a day would close the gap.", "{weekPct}% of targets. Good base; tighten it next week."],
    poor: ["{weekPct}% this week. Pick two fixed study blocks for next week and protect them.", "A light week ({weekPct}%). Shrink the plan if you must, but don't skip it."],
    zero: ["Nothing logged this week. Start Monday with a single small session.", "A zero week. Reset: one problem on Monday morning."],
    _: ["Another week done. Here is where you stand."],
  },
};

const SAVAGE: Record<string, Pool> = {
  morning: {
    "backlog-heavy": [
      "{backlog} cheezein pending hain bosdike, aur tu abhi bhi scroll kar raha hai?",
      "Backlog {backlog} ka ho gaya {name}, ab toh sharam kar lawde!",
      "{backlog} ka backlog? Interview mein bhi aise hi latak jayega kya chutiye?",
    ],
    backlog: ["{backlog} pending hai nalle, aaj do toh nipta de.", "Purana kaam clear kar pehle {name}, naya baad mein.", "{backlog} baaki hain bsdk, aaj thoda toh ghis!"],
    "interview-close": ["Sirf {daysLeft} din bache hain interview mein, aur tu abhi bhi time pass kar raha hai {name}?", "{daysLeft} din! Ab bahane ka time khatam, padh lawde."],
    "streak-long": ["{streak} din ka streak hai, ab tod mat dena bsdk!", "{streak} din ho gaye, aaj mat bhaagna lawde."],
    clean: ["Backlog zero hai, aaj bhi aisa hi rakh {name}.", "Kuch pending nahi, shabaash. Ab aaj ka bhi nipta de bsdk."],
  },
  evening: {
    "quiz-only": ["Sirf quiz bacha hai lawde, 10 minute mein nipta de!", "Bas quiz reh gaya, ab chhod mat bsdk."],
    almost: ["{left} bacha hai bas, ab chhod mat bsdk.", "{pct}% ho gaya, {left} aur. Khatam kar {name}!"],
    zero: ["Aaj ek bhi problem nahi? {name}, sharam kar thodi!", "Din khatam hone wala hai aur tu zero pe baitha hai bosdike!"],
    some: ["{left} abhi bhi pending, streak {streak} ki hai, tod mat nalle!", "{left} baaki hai lawde, abhi bhi time hai."],
  },
  night: {
    done: ["{solved} problems aaj, streak {streak}. Faad diya {name}!", "Aaj ka kaam khatam, shabaash bosdike!"],
    partial: ["Sirf {pct}% hua aaj. Kal ka plan aur bhaari hoga, jhelna bsdk.", "{pct}% hi hua {name}. Kal pura karna padega lawde."],
    zero: ["Aaj zero! {name}, kal bhi aise hi karega toh sab khatam.", "Poora din gaya aur kuch nahi kiya, sharam aayi ya nahi chutiye?"],
    "streak-broken": ["Streak toot gayi lawde. Ab phir se 1 se shuru kar.", "Streak gaya {name}. Kal se dobara, aur is baar mat todna bsdk."],
  },
  weekly: {
    great: ["Is hafte {weekPct}% targets maare. Aise hi chalta reh {name}!", "{weekPct}%! Shabaash bosdike, agle hafte bhi yahi."],
    ok: ["Hafta theek tha, {weekPct}%. Thoda aur zor laga bsdk.", "{weekPct}% hua. Itne mein sab nahi hota {name}, aur ghis."],
    poor: ["Sirf {weekPct}% is hafte? Sharam kar chutiye, agle hafte pura kar!", "{weekPct}% hi? Tujhse yeh nahi ho payega kya {name}?"],
    zero: ["Poora hafta zero? Tujhse nahi ho payega kya {name}?", "Ek hafta nikal gaya aur kuch nahi hua. Sharam kar lawde!"],
  },
};

/** Lines whose {tokens} the context can fill. */
function usable(line: string, c: RoastContext): boolean {
  const need = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).filter((t) => t !== "name");
  return need.every((t) => (c as Record<string, unknown>)[t] !== undefined);
}

function fill(line: string, c: RoastContext, name: string): string {
  return line.replace(/\{(\w+)\}/g, (_, t: string) => (t === "name" ? name : String((c as Record<string, unknown>)[t] ?? "")));
}

export type RoastMailSlot = "morning" | "evening" | "night" | "rest" | "weekly";

/**
 * The roast for this moment at this level, or null when the level is off. Picks a line that fits the
 * situation and the numbers you actually have; falls back to the slot's general lines. `night` is the
 * end-of-day recap, `evening` the mid-evening nudge. Stable for the same seed.
 */
export function roastFor(level: RoastLevel, slot: RoastMailSlot, ctx: RoastContext, seed: string, name: string): string | null {
  if (level === "off") return null;
  const tag = slot === "night" ? NIGHT_SITUATION(ctx) : slot === "rest" ? null : roastSituation(slot === "evening" ? "evening" : slot, ctx);
  const book = level === "coach" ? COACH : SAVAGE;
  const pool = book[slot] ?? {};
  const specific = (tag ? (pool[tag] ?? []) : []).filter((l) => usable(l, ctx));
  const general = (pool._ ?? []).filter((l) => usable(l, ctx));
  const legacy: readonly string[] = level === "savage" ? ROAST_LINES[slot === "night" ? "evening" : slot === "evening" ? "evening" : slot] ?? [] : [];
  const lines = specific.length > 0 ? specific : general.length > 0 ? general : legacy;
  if (lines.length === 0) return null;
  const line = lines[hash(`${level}:${slot}:${tag}:${seed}`) % lines.length]!;
  return fill(line, ctx, name);
}
