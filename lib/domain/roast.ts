import { escapeHtml } from "./reminders";

/**
 * "Roast mode": desi tough-love one-liners that lead the morning / evening
 * emails and Telegram messages. Opt-out in Settings → Notification channels.
 * `{name}` becomes ADMIN_NAME.
 */
export type RoastSlot = "morning" | "evening" | "done" | "rest";

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
}

/** The roast line becomes the subject and leads the body; the original title follows it. */
export function withRoast(content: PushContent, line: string): PushContent {
  const banner = `<p style="margin:0 0 16px;padding:12px 16px;border-radius:10px;background:#1f1633;color:#c4b5fd;font:600 18px/1.4 system-ui,-apple-system,Segoe UI,sans-serif">${escapeHtml(line)}</p>`;
  return {
    title: `${line} | ${content.title}`,
    body: `${line}\n\n${content.body}`,
    ...(content.html !== undefined ? { html: `${banner}${content.html}` } : {}),
  };
}
