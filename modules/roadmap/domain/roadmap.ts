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
  /** Skill names job postings use for this node ("rag", "langgraph"), matched against the jobs you saved. */
  skills: z.array(text(40)).max(12).default([]),
});
export type RoadmapNode = z.infer<typeof roadmapNodeSchema>;

/** A focus inside one roadmap ("agent engineer"): the sections that matter most for that role. */
export const roadmapTrackSchema = z.object({ id, title: text(40), blurb: text(160, 10), sections: z.array(id).min(1).max(20) });
export type RoadmapTrack = z.infer<typeof roadmapTrackSchema>;

export const roadmapSchema = z.object({
  id,
  title: text(60),
  blurb: text(300, 10),
  audience: text(120),
  tracks: z.array(roadmapTrackSchema).max(8).default([]),
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
    const sectionIds = new Set(r.sections.map((x) => x.id));
    for (const t of r.tracks) for (const sid of t.sections) if (!sectionIds.has(sid)) out.push(`${r.id}: track ${t.id} names unknown section ${sid}`);
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

/** The next few unfinished nodes, must-dos first, in roadmap order. A track limits the choice to its sections. */
export function nextNodes(r: Roadmap, statuses: ReadonlyMap<string, NodeStatus>, limit = 3, track?: RoadmapTrack | null): Array<RoadmapNode & { sectionId: string }> {
  const inTrack = track ? new Set(track.sections) : null;
  const open = allNodes(r).filter((n) => !statuses.get(n.id)?.done && n.priority !== "skip" && (!inTrack || inTrack.has(n.sectionId)));
  return [...open.filter((n) => n.priority === "must"), ...open.filter((n) => n.priority === "can")].slice(0, Math.max(0, limit));
}

export interface TrackProgress {
  track: RoadmapTrack;
  must: { done: number; total: number };
  /** Percent of the track's must-do nodes done. */
  pct: number;
  /** Sections of the track with must-dos still open, least finished first. */
  gaps: Array<{ sectionId: string; open: number; total: number }>;
}

/** How far you are towards each role focus: the gap between where you are and being ready for that role. */
export function trackProgress(r: Roadmap, statuses: ReadonlyMap<string, NodeStatus>): TrackProgress[] {
  return r.tracks.map((track) => {
    const sections = r.sections.filter((s) => track.sections.includes(s.id));
    const gaps = sections
      .map((s) => {
        const musts = s.nodes.filter((n) => n.priority === "must");
        return { sectionId: s.id, open: musts.filter((n) => !statuses.get(n.id)?.done).length, total: musts.length };
      })
      .filter((g) => g.open > 0)
      .sort((a, b) => b.open / b.total - a.open / a.total);
    const musts = sections.flatMap((s) => s.nodes.filter((n) => n.priority === "must"));
    const done = musts.filter((n) => statuses.get(n.id)?.done).length;
    return { track, must: { done, total: musts.length }, pct: musts.length ? Math.round((100 * done) / musts.length) : 0, gaps };
  });
}

export interface ResourceEntry {
  url: string;
  title: string;
  kind: (typeof LINK_KINDS)[number];
  /** Every node that lists this link. */
  nodes: Array<{ id: string; title: string; sectionId: string; sectionTitle: string }>;
}

/** Every distinct learning link in a roadmap with the nodes that use it, for the documentation library. */
export function collectResources(r: Roadmap): ResourceEntry[] {
  const byUrl = new Map<string, ResourceEntry>();
  for (const s of r.sections) {
    for (const n of s.nodes) {
      for (const l of n.links) {
        const entry = byUrl.get(l.url) ?? { url: l.url, title: l.title, kind: l.kind, nodes: [] };
        entry.nodes.push({ id: n.id, title: n.title, sectionId: s.id, sectionTitle: s.title });
        byUrl.set(l.url, entry);
      }
    }
  }
  return [...byUrl.values()];
}

export interface NodeDemand {
  nodeId: string;
  title: string;
  /** How many of your jobs ask for at least one of the node's skills. */
  jobs: number;
  /** The node's skills that appeared, most asked first. */
  skills: string[];
  done: boolean;
}

/**
 * Which roadmap nodes your saved jobs ask for most. `jobTerms` is one list of skill terms per job (already
 * extracted); a node counts a job once however many of its skills the job names. Nodes nobody asks for are left out.
 */
export function demandByNode(r: Roadmap, jobTerms: ReadonlyArray<readonly string[]>, statuses: ReadonlyMap<string, NodeStatus>, limit = 6): NodeDemand[] {
  const jobSets = jobTerms.map((t) => new Set(t.map((x) => x.toLowerCase())));
  const out: NodeDemand[] = [];
  for (const n of allNodes(r)) {
    if (n.skills.length === 0) continue;
    const skills = n.skills.map((x) => x.toLowerCase());
    const counts = skills.map((sk) => jobSets.filter((j) => j.has(sk)).length);
    const jobs = jobSets.filter((j) => skills.some((sk) => j.has(sk))).length;
    if (jobs === 0) continue;
    const seen = skills.map((sk, i) => ({ sk, c: counts[i]! })).filter((x) => x.c > 0).sort((a, b) => b.c - a.c).map((x) => x.sk);
    out.push({ nodeId: n.id, title: n.title, jobs, skills: seen, done: !!statuses.get(n.id)?.done });
  }
  return out.sort((a, b) => b.jobs - a.jobs || Number(a.done) - Number(b.done)).slice(0, Math.max(0, limit));
}
