/**
 * roadmap.sh-style roadmaps: sections of nodes tagged must-do / can-do / can-skip, each with learning links,
 * optional practice problems and a quiz. A node ticks itself once every part it declares is done. Separate from
 * the study plan, so it never touches the streak or the deadline maths. Pure.
 */
import { z } from "zod";

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const https = z.string().url().refine((u) => u.startsWith("https://"), "Use an https link");

export const PRIORITIES = ["must", "can", "skip"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = { must: "Must do", can: "Can do", skip: "Can skip" };

export const LINK_KINDS = ["article", "docs", "video", "course", "book", "tool"] as const;

export const roadmapNodeSchema = z.object({
  id,
  title: text(80),
  summary: text(240, 10),
  priority: z.enum(PRIORITIES),
  /**
   * Sub-topics you tick one by one. Ticks are stored by index, so only append new items: never reorder or
   * delete existing ones.
   */
  checklist: z.array(text(160, 3)).max(12).default([]),
  links: z.array(z.object({ title: text(120), url: https, kind: z.enum(LINK_KINDS) })).max(8).default([]),
  /** `${courseId}/${lessonId}` of an in-app lesson that teaches this node. */
  lesson: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/).optional(),
  /** Problem slugs that must all be solved. */
  problems: z.array(z.string()).max(12).default([]),
  /** A syllabus subtopic or topic id whose practice quiz must be passed. */
  quiz: z.string().optional(),
});
export type RoadmapNode = z.infer<typeof roadmapNodeSchema>;

export const roadmapSchema = z.object({
  id,
  title: text(60),
  blurb: text(300, 10),
  audience: text(120),
  sections: z.array(z.object({ id, title: text(80), nodes: z.array(roadmapNodeSchema).min(1).max(24) })).min(2).max(20),
});
export type Roadmap = z.infer<typeof roadmapSchema>;

export const allNodes = (r: Roadmap): Array<RoadmapNode & { sectionId: string }> => r.sections.flatMap((s) => s.nodes.map((n) => ({ ...n, sectionId: s.id })));

/** Every problem with the content as a list of messages (empty when it is consistent). */
export function roadmapProblems(
  roadmaps: readonly Roadmap[],
  known: { problem: (slug: string) => boolean; lesson: (key: string) => boolean; quiz: (ref: string) => boolean },
): string[] {
  const out: string[] = [];
  const rids = roadmaps.map((r) => r.id);
  rids.forEach((x, i) => rids.indexOf(x) !== i && out.push(`duplicate roadmap ${x}`));
  for (const r of roadmaps) {
    const nodes = allNodes(r);
    const ids = nodes.map((n) => n.id);
    ids.forEach((x, i) => ids.indexOf(x) !== i && out.push(`${r.id}: duplicate node ${x}`));
    if (!nodes.some((n) => n.priority === "must")) out.push(`${r.id}: no must-do nodes`);
    for (const n of nodes) {
      const k = `${r.id}/${n.id}`;
      for (const p of n.problems) if (!known.problem(p)) out.push(`${k}: unknown problem ${p}`);
      if (n.lesson && !known.lesson(n.lesson)) out.push(`${k}: unknown lesson ${n.lesson}`);
      if (n.quiz && !known.quiz(n.quiz)) out.push(`${k}: unknown quiz ref ${n.quiz}`);
      if (n.links.length === 0 && !n.lesson && n.problems.length === 0 && !n.quiz && n.checklist.length === 0) out.push(`${k}: nothing to learn or do`);
      const urls = n.links.map((l) => l.url);
      urls.forEach((u, i) => urls.indexOf(u) !== i && out.push(`${k}: repeated link ${u}`));
      const items = n.checklist.map((c) => c.toLowerCase());
      items.forEach((c, i) => items.indexOf(c) !== i && out.push(`${k}: repeated checklist item ${n.checklist[i]}`));
    }
  }
  return out;
}

/* ------------------------------ auto-tick ------------------------------ */

/** What the rest of the app knows, gathered by the service. */
export interface NodeSignals {
  /** Link urls you opened or marked read on this node. */
  readLinks: readonly string[];
  /** Finished in-app lessons as `courseId/lessonId`. */
  doneLessons: ReadonlySet<string>;
  solvedProblems: ReadonlySet<string>;
  /** Practice refs with a submitted attempt at or above the pass mark. */
  passedQuizzes: ReadonlySet<string>;
  /** Checklist indexes you ticked (stale indexes beyond the list are ignored). */
  checked?: readonly number[];
  /** You ticked it by hand. */
  manual: boolean;
}

export interface NodeStatus {
  /** null = this node has no such part. */
  reading: boolean | null;
  practice: boolean | null;
  quiz: boolean | null;
  checklist: boolean | null;
  /** Checklist items ticked out of the total. */
  topics: { done: number; total: number };
  manual: boolean;
  done: boolean;
  /** Parts done out of parts required, for a progress ring. */
  parts: { done: number; total: number };
}

/** A node is done when every part it declares is done, or when you ticked it by hand. */
export function nodeStatus(node: Pick<RoadmapNode, "links" | "lesson" | "problems" | "quiz"> & { checklist?: readonly string[] }, s: NodeSignals): NodeStatus {
  const hasReading = node.links.length > 0 || !!node.lesson;
  const read = new Set(s.readLinks);
  const reading = hasReading ? (!node.lesson || s.doneLessons.has(node.lesson)) && node.links.every((l) => read.has(l.url)) : null;
  const practice = node.problems.length > 0 ? node.problems.every((p) => s.solvedProblems.has(p)) : null;
  const quiz = node.quiz ? s.passedQuizzes.has(node.quiz) : null;
  const total = node.checklist?.length ?? 0;
  const ticked = new Set((s.checked ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < total)).size;
  const checklist = total > 0 ? ticked === total : null;
  const required = [reading, practice, quiz, checklist].filter((v): v is boolean => v !== null);
  const doneParts = required.filter(Boolean).length;
  return {
    reading,
    practice,
    quiz,
    checklist,
    topics: { done: ticked, total },
    manual: s.manual,
    done: s.manual || (required.length > 0 && doneParts === required.length),
    parts: { done: doneParts, total: required.length },
  };
}

export interface RoadmapProgress {
  must: { done: number; total: number };
  can: { done: number; total: number };
  skip: { done: number; total: number };
  /** Percent of must-do nodes done (the number that matters). */
  pct: number;
}

export function roadmapProgress(r: Roadmap, statuses: ReadonlyMap<string, NodeStatus>): RoadmapProgress {
  const acc: RoadmapProgress = { must: { done: 0, total: 0 }, can: { done: 0, total: 0 }, skip: { done: 0, total: 0 }, pct: 0 };
  for (const n of allNodes(r)) {
    acc[n.priority].total++;
    if (statuses.get(n.id)?.done) acc[n.priority].done++;
  }
  acc.pct = acc.must.total ? Math.round((100 * acc.must.done) / acc.must.total) : 0;
  return acc;
}

/** The next must-do node you haven't finished, then can-do, in roadmap order. Skippable nodes are never suggested. */
export function nextNode(r: Roadmap, statuses: ReadonlyMap<string, NodeStatus>): (RoadmapNode & { sectionId: string }) | null {
  const open = allNodes(r).filter((n) => !statuses.get(n.id)?.done);
  return open.find((n) => n.priority === "must") ?? open.find((n) => n.priority === "can") ?? null;
}
