/**
 * The subjects you keep a Gemini project (or Gem) for. Each "Ask Gemini" button picks the
 * subject that fits what you're looking at, and opens that project's link from Settings.
 */
export const ASK_SUBJECTS = [
  { id: "dsa", label: "DSA" },
  { id: "hld", label: "System Design" },
  { id: "lld", label: "LLD & OOP" },
  { id: "dbms", label: "DBMS & SQL" },
  { id: "os", label: "Operating Systems" },
  { id: "js", label: "JavaScript & Node" },
  { id: "ai", label: "AI & ML" },
  { id: "general", label: "Everything else" },
] as const;

export type AskSubject = (typeof ASK_SUBJECTS)[number]["id"];
export const ASK_SUBJECT_IDS = ASK_SUBJECTS.map((s) => s.id) as readonly AskSubject[];

export const FALLBACK_GEMINI_URL = "https://gemini.google.com/app";
/** Only Google's own AI hosts, over https: a pasted link can never send you (or a prompt) anywhere else. */
export const GEMINI_HOSTS = ["gemini.google.com", "aistudio.google.com", "notebooklm.google.com"] as const;

export function isAskSubject(value: string): value is AskSubject {
  return (ASK_SUBJECT_IDS as readonly string[]).includes(value);
}

/** Syllabus track (and topic id for the mixed "cs" track) to the subject whose project fits. */
export function subjectForTopic(topicId: string, track: string): AskSubject {
  switch (track) {
    case "js":
    case "node":
      return "js";
    case "dsa":
      return "dsa";
    case "dbms":
      return "dbms";
    case "oop":
    case "lld":
      return "lld";
    case "hld":
      return "hld";
    case "ai":
      return "ai";
    case "cs":
      return topicId.startsWith("os-") ? "os" : topicId.startsWith("net-") || topicId.startsWith("api-") ? "hld" : "general";
    default:
      return "general";
  }
}

export type LinkCheck = { ok: true; url: string | null } | { ok: false; error: string };

/** Blank clears a link. Anything else must be an https link on a Google AI host. */
export function checkGeminiLink(raw: string): LinkCheck {
  const value = raw.trim();
  if (value === "") return { ok: true, url: null };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "Not a valid link" };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Use an https link" };
  if (url.username || url.password) return { ok: false, error: "The link can't contain a login" };
  if (!(GEMINI_HOSTS as readonly string[]).includes(url.hostname)) return { ok: false, error: `Use a link on ${GEMINI_HOSTS.join(", ")}` };
  return { ok: true, url: url.toString() };
}

/** The subject's project, else your "Everything else" project, else Gemini's home page. */
export function resolveGeminiLink(links: Partial<Record<AskSubject, string>>, subject: AskSubject): string {
  return links[subject] || links.general || FALLBACK_GEMINI_URL;
}
