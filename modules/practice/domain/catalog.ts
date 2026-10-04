/**
 * The Practice hub: one list of everything you can practise, across subjects (DSA, system design, OS, DBMS,
 * networking, LLD, web, AI...) and kinds (quiz sets, design cases, code problems, flashcards, aptitude). The
 * service gathers content and progress; this module turns them into entries with a subject, a status and a link
 * to the runner that already exists, and filters and recommends. Pure.
 */

export const SUBJECTS = [
  { id: "dsa", name: "DSA" },
  { id: "js", name: "JavaScript & TypeScript" },
  { id: "node", name: "Node.js" },
  { id: "dbms", name: "DBMS & SQL" },
  { id: "os", name: "Operating systems" },
  { id: "networking", name: "Networking & APIs" },
  { id: "oop", name: "OOP & patterns" },
  { id: "lld", name: "Low-level design" },
  { id: "hld", name: "System design" },
  { id: "web", name: "Web & frontend" },
  { id: "ai", name: "AI engineering" },
  { id: "behavioral", name: "Behavioural & career" },
  { id: "aptitude", name: "Aptitude" },
] as const;
export type SubjectId = (typeof SUBJECTS)[number]["id"];
export const SUBJECT_NAME = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.name])) as Record<SubjectId, string>;

export const KINDS = ["quiz", "case", "code", "flashcards", "aptitude"] as const;
export type PracticeKind = (typeof KINDS)[number];
export const KIND_LABEL: Record<PracticeKind, string> = { quiz: "Quiz set", case: "Design / case", code: "Code", flashcards: "Flashcards", aptitude: "Aptitude" };

export const STATUSES = ["new", "started", "mastered"] as const;
export type EntryStatus = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<EntryStatus, string> = { new: "Not started", started: "In progress", mastered: "Mastered" };

/** The subject a syllabus topic belongs to. The CS track is split into operating systems and networking. */
export function subjectOfTopic(topic: { id: string; track: string }): SubjectId {
  if (topic.track === "cs") return topic.id.startsWith("os-") ? "os" : "networking";
  const direct = SUBJECTS.find((s) => s.id === topic.track);
  return direct ? direct.id : "behavioral";
}

export interface PracticeEntry {
  id: string;
  subject: SubjectId;
  kind: PracticeKind;
  title: string;
  detail: string;
  href: string;
  /** The syllabus topic this practice is about, so "only what I have studied" can match it. */
  topicId?: string;
  status: EntryStatus;
  done: number;
  total: number;
}

export interface Mastery {
  bestPct: number;
  attempts: number;
  masteredOn: string | null;
}

export interface CatalogInput {
  topics: Array<{ id: string; title: string; track: string; questions: number; subtopics: number }>;
  mastery: Readonly<Record<string, Mastery>>;
  /** Studied subtopic count per topic id (ticked or finished through a lesson). */
  studiedPerTopic: Readonly<Record<string, number>>;
  /** Pass mark for case quizzes. */
  passPct: number;
  cases: Array<{ ref: string; title: string; topicId: string; href: string; subject: SubjectId; level: "core" | "advanced" }>;
  code: Array<{ id: string; subject: SubjectId; title: string; total: number; solved: number; href: string }>;
  flashcards: Array<{ id: string; subject: SubjectId; title: string; total: number; known: number; review: number; href: string }>;
  aptitude: { total: number; href: string };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function statusFromCounts(done: number, total: number, touched: boolean): EntryStatus {
  if (total > 0 && done >= total) return "mastered";
  return done > 0 || touched ? "started" : "new";
}

export function buildCatalog(input: CatalogInput): PracticeEntry[] {
  const out: PracticeEntry[] = [];

  for (const t of input.topics) {
    if (t.questions === 0) continue;
    const m = input.mastery[t.id];
    const studied = input.studiedPerTopic[t.id] ?? 0;
    out.push({
      id: `quiz:${t.id}`,
      subject: subjectOfTopic(t),
      kind: "quiz",
      title: t.title,
      detail: `${plural(t.questions, "question")} · ${studied}/${t.subtopics} studied${m?.masteredOn ? " · mastered" : ""}`,
      href: `/learn/${encodeURIComponent(t.id)}`,
      topicId: t.id,
      status: m?.masteredOn ? "mastered" : studied > 0 || (m?.attempts ?? 0) > 0 ? "started" : "new",
      done: studied,
      total: t.subtopics,
    });
  }

  for (const c of input.cases) {
    const m = input.mastery[c.ref];
    const passed = !!m && m.bestPct >= input.passPct;
    out.push({
      id: `case:${c.ref}`,
      subject: c.subject,
      kind: "case",
      title: c.title,
      detail: `${c.level === "advanced" ? "Advanced case" : "Core case"}${m?.attempts ? ` · best ${m.bestPct}%` : ""}`,
      href: c.href,
      topicId: c.topicId,
      status: passed ? "mastered" : (m?.attempts ?? 0) > 0 ? "started" : "new",
      done: passed ? 1 : 0,
      total: 1,
    });
  }

  for (const c of input.code) {
    out.push({ id: `code:${c.id}`, subject: c.subject, kind: "code", title: c.title, detail: `${c.solved}/${plural(c.total, "problem")} solved`, href: c.href, status: statusFromCounts(c.solved, c.total, false), done: c.solved, total: c.total });
  }

  for (const f of input.flashcards) {
    out.push({ id: `flashcards:${f.id}`, subject: f.subject, kind: "flashcards", title: f.title, detail: `${f.known}/${plural(f.total, "question")} known${f.review ? ` · ${f.review} to review` : ""}`, href: f.href, status: statusFromCounts(f.known, f.total, f.review > 0), done: f.known, total: f.total });
  }

  if (input.aptitude.total > 0) {
    out.push({ id: "aptitude:all", subject: "aptitude", kind: "aptitude", title: "Aptitude: quant, logical and verbal", detail: `${plural(input.aptitude.total, "question")} plus generated drills`, href: input.aptitude.href, status: "new", done: 0, total: 0 });
  }
  return out;
}

export interface CatalogFilter {
  subject?: SubjectId | null;
  kind?: PracticeKind | null;
  status?: EntryStatus | null;
  /** Keep only practice on topics you have studied. Entries with no syllabus topic (code, flashcards, aptitude) are kept out. */
  studiedOnly?: boolean;
}

export function filterCatalog(entries: readonly PracticeEntry[], f: CatalogFilter, studiedTopics: ReadonlySet<string>): PracticeEntry[] {
  return entries.filter((e) => (!f.subject || e.subject === f.subject) && (!f.kind || e.kind === f.kind) && (!f.status || e.status === f.status) && (!f.studiedOnly || (e.topicId !== undefined && studiedTopics.has(e.topicId))));
}

/** Entries per subject, for the filter chips. */
export function subjectCounts(entries: readonly PracticeEntry[]): Map<SubjectId, number> {
  const out = new Map<SubjectId, number>();
  for (const e of entries) out.set(e.subject, (out.get(e.subject) ?? 0) + 1);
  return out;
}

/**
 * What to practise next: things you have studied but not mastered come first, then things in progress, then the
 * rest of what you have not touched. Mastered entries are never suggested.
 */
export function recommend(entries: readonly PracticeEntry[], studiedTopics: ReadonlySet<string>, n = 4): PracticeEntry[] {
  const score = (e: PracticeEntry) => {
    const studied = e.topicId !== undefined && studiedTopics.has(e.topicId);
    return (studied ? 4 : 0) + (e.status === "started" ? 2 : 0) + (e.kind === "quiz" || e.kind === "case" ? 1 : 0);
  };
  return entries
    .filter((e) => e.status !== "mastered" && e.kind !== "aptitude")
    .map((e, i) => ({ e, s: score(e), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, n)
    .map((x) => x.e);
}
