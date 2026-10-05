import { roadmapById, roadmaps, WEB_LESSON_PREFIX } from "@/core/roadmaps";
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
  /** Links you opened, per node id. */
  readLinks: Map<string, string[]>;
  /** Checklist indexes you ticked, per node id. */
  checked: Map<string, number[]>;
  progress: RoadmapProgress;
  /** The signals behind the statuses, so a page can show which problem or quiz is still open. */
  solved: ReadonlySet<string>;
  passedQuizzes: ReadonlySet<string>;
  doneLessons: ReadonlySet<string>;
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

  const byNode = new Map(rows.map((x) => [x.nodeId, x]));
  const solvedSet = new Set(solved.map((s) => s.slug));
  const passedSet = new Set(passed as string[]);
  const statuses = new Map<string, NodeStatus>();
  const readLinks = new Map<string, string[]>();
  const checked = new Map<string, number[]>();
  for (const n of nodes) {
    const row = byNode.get(n.id);
    readLinks.set(n.id, row?.readLinks ?? []);
    checked.set(n.id, row?.checked ?? []);
    statuses.set(n.id, nodeStatus(n, { readLinks: row?.readLinks ?? [], checked: row?.checked ?? [], doneLessons, solvedProblems: solvedSet, passedQuizzes: passedSet, manual: !!row?.manualDoneOn }));
  }
  return { joinedOn: enrollment?.joinedOn ?? null, statuses, readLinks, checked, progress: roadmapProgress(r, statuses), solved: solvedSet, passedQuizzes: passedSet, doneLessons };
}

export interface RoadmapSummary {
  roadmap: Roadmap;
  joinedOn: string | null;
  progress: RoadmapProgress;
  /** The next node to work on, for the "Continue" link. */
  next: { id: string; title: string } | null;
}

/** Every roadmap with whether you joined it and how far you are. */
export async function listRoadmaps(): Promise<RoadmapSummary[]> {
  return Promise.all(roadmaps.map(async (roadmap) => {
    const state = await getRoadmapState(roadmap);
    const n = nextNode(roadmap, state.statuses);
    return { roadmap, joinedOn: state.joinedOn, progress: state.progress, next: n ? { id: n.id, title: n.title } : null };
  }));
}

export async function joinRoadmap(roadmapId: string, today: DateStr): Promise<void> {
  if (!roadmapById.has(roadmapId)) throw new Error("Unknown roadmap");
  await connectDb();
  await RoadmapEnrollment.updateOne({ roadmapId }, { $setOnInsert: { joinedOn: today } }, { upsert: true });
}

/** Leaves a roadmap. What you did on its nodes is kept, so joining again picks up where you were. */
export async function leaveRoadmap(roadmapId: string): Promise<void> {
  if (!roadmapById.has(roadmapId)) throw new Error("Unknown roadmap");
  await connectDb();
  await RoadmapEnrollment.deleteOne({ roadmapId });
}

function findNode(roadmapId: string, nodeId: string) {
  const r = roadmapById.get(roadmapId);
  const node = r ? allNodes(r).find((n) => n.id === nodeId) : undefined;
  if (!node) throw new Error("Unknown node");
  return node;
}

/** Records that you opened (or un-marks) a learning link on a node. Only links the node really has are accepted. */
export async function setLinkRead(roadmapId: string, nodeId: string, url: string, read: boolean): Promise<void> {
  const node = findNode(roadmapId, nodeId);
  if (!node.links.some((l) => l.url === url)) throw new Error("Unknown link");
  await connectDb();
  await RoadmapNodeProgress.updateOne({ roadmapId, nodeId }, read ? { $addToSet: { readLinks: url } } : { $pull: { readLinks: url } }, { upsert: true });
}

/** Ticks (or unticks) one checklist item on a node. Only indexes the node really has are accepted. */
export async function setChecklistItem(roadmapId: string, nodeId: string, index: number, done: boolean): Promise<void> {
  const node = findNode(roadmapId, nodeId);
  if (!Number.isInteger(index) || index < 0 || index >= node.checklist.length) throw new Error("Unknown topic");
  await connectDb();
  await RoadmapNodeProgress.updateOne({ roadmapId, nodeId }, done ? { $addToSet: { checked: index } } : { $pull: { checked: index } }, { upsert: true });
}

/** Ticks a node by hand (for something learned elsewhere), or clears the tick. */
export async function setNodeManual(roadmapId: string, nodeId: string, done: boolean, today: DateStr): Promise<void> {
  findNode(roadmapId, nodeId);
  await connectDb();
  await RoadmapNodeProgress.updateOne({ roadmapId, nodeId }, { $set: { manualDoneOn: done ? today : null } }, { upsert: true });
}
