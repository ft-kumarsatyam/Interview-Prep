/**
 * Study notes for the sub-topics of a roadmap node: a quick-review explanation, key points and a few questions
 * with model answers. Each note is keyed by the sub-topic's title, never by its position in the checklist, so
 * reordering or inserting checklist items does not detach a note. Pure.
 */
import { z } from "zod";

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60);
const https = z.string().url().refine((u) => u.startsWith("https://"), "Use an https link");

export const QUESTION_KINDS = ["recall", "apply", "debug"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];
export const QUESTION_KIND_LABEL: Record<QuestionKind, string> = { recall: "Recall", apply: "Apply", debug: "Debug" };

export const STUDY_STATUSES = ["new", "review", "known"] as const;
export type StudyStatus = (typeof STUDY_STATUSES)[number];

export const studyQuestionSchema = z.object({
  q: text(240, 8),
  /** A short model answer, markdown. */
  a: text(900, 20),
  kind: z.enum(QUESTION_KINDS),
});
export type StudyQuestion = z.infer<typeof studyQuestionSchema>;

export const studyEntrySchema = z.object({
  /** Markdown: the quick review. What it is, why it matters, how it works, where it goes wrong. */
  explain: text(2200, 200),
  keyPoints: z.array(text(200, 5)).min(2).max(5),
  questions: z.array(studyQuestionSchema).min(2).max(4),
  /** A lab exercise (`data/genai-lab`) that practises this sub-topic. */
  lab: slug.optional(),
  /** Extra reading for this sub-topic only. */
  links: z.array(z.object({ title: text(120), url: https })).max(4).default([]),
});
export type StudyEntry = z.infer<typeof studyEntrySchema>;

export const studyFileSchema = z.object({
  roadmapId: slug,
  /** nodeId -> sub-topic key -> note. */
  nodes: z.record(slug, z.record(slug, studyEntrySchema)),
});
export type StudyFile = z.infer<typeof studyFileSchema>;

/**
 * The stable key of a checklist item: its title (the text before the first ": "), minus a leading "[Group]" tag,
 * as a slug. "[Component-level evaluation] Retrieval metrics: Measure…" becomes "retrieval-metrics".
 */
export function subtopicKey(item: string): string {
  const head = item.replace(/^\[[^\]]*\]\s*/, "").split(/:\s/)[0] ?? item;
  return head
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** The part of a checklist item after its title: the one-line description from the source roadmap. */
export function subtopicDetail(item: string): string {
  const rest = item.replace(/^\[[^\]]*\]\s*/, "");
  const at = rest.indexOf(": ");
  return at === -1 ? "" : rest.slice(at + 2);
}

interface RoadmapShape {
  id: string;
  sections: ReadonlyArray<{ nodes: ReadonlyArray<{ id: string; checklist: readonly string[] }> }>;
}

/**
 * Every problem with the study notes as a list of messages (empty when consistent). A node that has notes must
 * cover its whole checklist, and every note must belong to a real checklist item.
 */
export function studyProblems(roadmaps: readonly RoadmapShape[], files: readonly StudyFile[], labIds?: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const byRoadmap = new Map(roadmaps.map((r) => [r.id, r]));
  const seenFiles = new Set<string>();
  for (const f of files) {
    const roadmap = byRoadmap.get(f.roadmapId);
    if (!roadmap) {
      out.push(`unknown roadmap ${f.roadmapId}`);
      continue;
    }
    const nodes = new Map(roadmap.sections.flatMap((s) => s.nodes).map((n) => [n.id, n]));
    for (const [nodeId, notes] of Object.entries(f.nodes)) {
      const where = `${f.roadmapId}/${nodeId}`;
      if (seenFiles.has(where)) out.push(`${where}: notes appear in two files`);
      seenFiles.add(where);
      const node = nodes.get(nodeId);
      if (!node) {
        out.push(`${where}: unknown node`);
        continue;
      }
      const keys = node.checklist.map(subtopicKey);
      keys.forEach((k, i) => keys.indexOf(k) !== i && out.push(`${where}: two checklist items share the key ${k}`));
      for (const k of Object.keys(notes)) if (!keys.includes(k)) out.push(`${where}: note ${k} matches no checklist item`);
      for (const k of keys) if (!notes[k]) out.push(`${where}: checklist item ${k} has no note`);
      for (const [k, e] of Object.entries(notes)) {
        if (/<\/?(script|iframe|style|img|a)\b/i.test(`${e.explain} ${e.questions.map((q) => q.a).join(" ")}`.replace(/```[\s\S]*?```/g, ""))) out.push(`${where}/${k}: raw HTML`);
        const qs = e.questions.map((q) => q.q.toLowerCase());
        qs.forEach((q, i) => qs.indexOf(q) !== i && out.push(`${where}/${k}: repeated question`));
        if (e.lab && labIds && !labIds.has(e.lab)) out.push(`${where}/${k}: unknown lab ${e.lab}`);
      }
    }
  }
  return out;
}

export interface StudyStats {
  total: number;
  known: number;
  review: number;
  fresh: number;
  pct: number;
}

/** How many of a node's notes you rated. `keys` are the sub-topic keys that have a note. */
export function studyStats(keys: readonly string[], status: ReadonlyMap<string, StudyStatus>): StudyStats {
  let known = 0;
  let review = 0;
  for (const k of keys) {
    const s = status.get(k);
    if (s === "known") known++;
    else if (s === "review") review++;
  }
  const total = keys.length;
  return { total, known, review, fresh: total - known - review, pct: total ? Math.round((100 * known) / total) : 0 };
}
