import { knownRoadmap, loadAllRoadmaps, loadRoadmap, WEB_LESSON_PREFIX } from "@/core/roadmaps";
import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { PracticeAttempt } from "@/core/models/learning";
import { ProblemProgress } from "@/core/models/progress";
import { RoadmapEnrollment, RoadmapNodeProgress } from "@/core/models/roadmap";
import { getAllDoneKeys } from "@/modules/course/services/progress";
import { allNodes, nextNode, nodeStatus, roadmapProgress, type NodeStatus, type Roadmap, type RoadmapProgress } from "@/modules/roadmap/domain/roadmap";
import { getDoneLessons } from "@/modules/learn/services/webdev";
import { getSettings } from "@/modules/settings/services/settings";

export interface RoadmapState {
  joinedOn: string | null;
  statuses: Map<string, NodeStatus>;
  readLinks: Map<string, string[]>;
  checked: Map<string, number[]>;
  progress: RoadmapProgress;
  solved: ReadonlySet<string>;
  passedQuizzes: ReadonlySet<string>;
  doneLessons: ReadonlySet<string>;
}

function stateFrom(
  r: Roadmap,
  enrollment: { joinedOn?: string } | null | undefined,
  rows: Array<{ nodeId: string; readLinks?: string[]; checked?: number[]; manualDoneOn?: string | null }>,
  solvedSet: ReadonlySet<string>,
  passedSet: ReadonlySet<string>,
  doneLessons: ReadonlySet<string>,
): RoadmapState {
  const byNode = new Map(rows.map((x) => [x.nodeId, x]));
  const statuses = new Map<string, NodeStatus>();
  const readLinks = new Map<string, string[]>();
  const checked = new Map<string, number[]>();
  for (const n of allNodes(r)) {
    const row = byNode.get(n.id);
    readLinks.set(n.id, row?.readLinks ?? []);
    checked.set(n.id, row?.checked ?? []);
    statuses.set(n.id, nodeStatus(n, { readLinks: row?.readLinks ?? [], checked: row?.checked ?? [], doneLessons, solvedProblems: solvedSet, passedQuizzes: passedSet, manual: !!row?.manualDoneOn }));
  }
  return { joinedOn: enrollment?.joinedOn ?? null, statuses, readLinks, checked, progress: roadmapProgress(r, statuses), solved: solvedSet, passedQuizzes: passedSet, doneLessons };
}

/** Gathers the signals for every node of one roadmap from the rest of the app and derives each node's status. */
export async function getRoadmapState(r: Roadmap): Promise<RoadmapState> {
  await connectDb();
  const nodes = allNodes(r);
  const slugs = [...new Set(nodes.flatMap((n) => n.problems))];
  const quizRefs = [...new Set(nodes.flatMap((n) => (n.quiz ? [n.quiz] : [])))];
  const settings = await getSettings();

  const [enrollment, rows, solved, passed, doneCourseLessons, doneWebLessons] = await Promise.all([
    RoadmapEnrollment.findOne({ roadmapId: r.id }).lean(),
    RoadmapNodeProgress.find({ roadmapId: r.id }).lean(),
    slugs.length ? ProblemProgress.find({ slug: { $in: slugs }, status: "solved" }, { slug: 1 }).lean() : Promise.resolve([]),
    quizRefs.length ? PracticeAttempt.distinct("ref", { ref: { $in: quizRefs }, submittedAt: { $ne: null }, pct: { $gte: settings.quizPassPct } }) : Promise.resolve([] as string[]),
    getAllDoneKeys(),
    getDoneLessons(),
  ]);
  const doneLessons = new Set([...doneCourseLessons, ...[...doneWebLessons.keys()].map((id) => `${WEB_LESSON_PREFIX}${id}`)]);
  return stateFrom(r, enrollment, rows, new Set(solved.map((s) => s.slug)), new Set(passed as string[]), doneLessons);
}

export interface RoadmapSummary {
  roadmap: Roadmap;
  joinedOn: string | null;
  progress: RoadmapProgress;
  next: { id: string; title: string } | null;
}

/** Every roadmap with whether you joined it and how far you are. One batched progress read. */
export async function listRoadmaps(): Promise<RoadmapSummary[]> {
  const roadmaps = await loadAllRoadmaps();
  await connectDb();
  const slugs = [...new Set(roadmaps.flatMap((r) => allNodes(r).flatMap((n) => n.problems)))];
  const quizRefs = [...new Set(roadmaps.flatMap((r) => allNodes(r).flatMap((n) => (n.quiz ? [n.quiz] : []))))];
  const settings = await getSettings();
  const [enrollments, rows, solved, passed, doneCourseLessons, doneWebLessons] = await Promise.all([
    RoadmapEnrollment.find({}).lean(),
    RoadmapNodeProgress.find({}).lean(),
    slugs.length ? ProblemProgress.find({ slug: { $in: slugs }, status: "solved" }, { slug: 1 }).lean() : Promise.resolve([]),
    quizRefs.length ? PracticeAttempt.distinct("ref", { ref: { $in: quizRefs }, submittedAt: { $ne: null }, pct: { $gte: settings.quizPassPct } }) : Promise.resolve([] as string[]),
    getAllDoneKeys(),
    getDoneLessons(),
  ]);
  const joined = new Map(enrollments.map((e) => [e.roadmapId, e]));
  const rowsByRoadmap = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = rowsByRoadmap.get(row.roadmapId) ?? [];
    list.push(row);
    rowsByRoadmap.set(row.roadmapId, list);
  }
  const solvedSet = new Set(solved.map((s) => s.slug));
  const passedSet = new Set(passed as string[]);
  const doneLessons = new Set([...doneCourseLessons, ...[...doneWebLessons.keys()].map((id) => `${WEB_LESSON_PREFIX}${id}`)]);
  return roadmaps.map((roadmap) => {
    const state = stateFrom(roadmap, joined.get(roadmap.id), rowsByRoadmap.get(roadmap.id) ?? [], solvedSet, passedSet, doneLessons);
    const n = nextNode(roadmap, state.statuses);
    return { roadmap, joinedOn: state.joinedOn, progress: state.progress, next: n ? { id: n.id, title: n.title } : null };
  });
}

export async function joinRoadmap(roadmapId: string, today: DateStr): Promise<void> {
  if (!knownRoadmap(roadmapId)) throw new Error("Unknown roadmap");
  await connectDb();
  await RoadmapEnrollment.updateOne({ roadmapId }, { $setOnInsert: { joinedOn: today } }, { upsert: true });
}

export async function leaveRoadmap(roadmapId: string): Promise<void> {
  if (!knownRoadmap(roadmapId)) throw new Error("Unknown roadmap");
  await connectDb();
  await RoadmapEnrollment.deleteOne({ roadmapId });
}

async function findNode(roadmapId: string, nodeId: string) {
  const r = await loadRoadmap(roadmapId);
  const node = r ? allNodes(r).find((n) => n.id === nodeId) : undefined;
  if (!node) throw new Error("Unknown node");
  return node;
}

export async function setLinkRead(roadmapId: string, nodeId: string, url: string, read: boolean): Promise<void> {
  const node = await findNode(roadmapId, nodeId);
  if (!node.links.some((l) => l.url === url)) throw new Error("Unknown link");
  await connectDb();
  await RoadmapNodeProgress.updateOne({ roadmapId, nodeId }, read ? { $addToSet: { readLinks: url } } : { $pull: { readLinks: url } }, { upsert: true });
}

export async function setChecklistItem(roadmapId: string, nodeId: string, index: number, done: boolean): Promise<void> {
  const node = await findNode(roadmapId, nodeId);
  if (!Number.isInteger(index) || index < 0 || index >= node.checklist.length) throw new Error("Unknown topic");
  await connectDb();
  await RoadmapNodeProgress.updateOne({ roadmapId, nodeId }, done ? { $addToSet: { checked: index } } : { $pull: { checked: index } }, { upsert: true });
}

export async function setNodeManual(roadmapId: string, nodeId: string, done: boolean, today: DateStr): Promise<void> {
  await findNode(roadmapId, nodeId);
  await connectDb();
  await RoadmapNodeProgress.updateOne({ roadmapId, nodeId }, { $set: { manualDoneOn: done ? today : null } }, { upsert: true });
}
