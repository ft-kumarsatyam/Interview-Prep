/**
 * Typed access to the GenAI study notes (data/genai-study/*). The node index is eager;
 * a level file loads only when a node page needs it. Not part of the syllabus.
 */
import nodeIndexJson from "@/data/genai-study/node-index.json";
import { studyFileSchema, subtopicKey, type StudyEntry, type StudyFile } from "@/modules/genai-study/domain/study";

const LEVEL_LOADERS: Record<number, () => Promise<{ default: unknown }>> = {
  0: () => import("@/data/genai-study/genai-16-levels/level-0.json"),
  1: () => import("@/data/genai-study/genai-16-levels/level-1.json"),
  2: () => import("@/data/genai-study/genai-16-levels/level-2.json"),
  3: () => import("@/data/genai-study/genai-16-levels/level-3.json"),
  4: () => import("@/data/genai-study/genai-16-levels/level-4.json"),
  5: () => import("@/data/genai-study/genai-16-levels/level-5.json"),
  6: () => import("@/data/genai-study/genai-16-levels/level-6.json"),
  7: () => import("@/data/genai-study/genai-16-levels/level-7.json"),
  8: () => import("@/data/genai-study/genai-16-levels/level-8.json"),
  9: () => import("@/data/genai-study/genai-16-levels/level-9.json"),
  10: () => import("@/data/genai-study/genai-16-levels/level-10.json"),
  11: () => import("@/data/genai-study/genai-16-levels/level-11.json"),
  12: () => import("@/data/genai-study/genai-16-levels/level-12.json"),
  13: () => import("@/data/genai-study/genai-16-levels/level-13.json"),
  15: () => import("@/data/genai-study/genai-16-levels/level-15.json"),
};

const index = new Set<string>();
for (const [roadmapId, nodes] of Object.entries(nodeIndexJson as Record<string, string[]>)) {
  for (const nodeId of nodes) index.add(`${roadmapId}/${nodeId}`);
}

export const studyNodeIndex = (): ReadonlySet<string> => index;
export const hasNodeStudy = (roadmapId: string, nodeId: string): boolean => index.has(`${roadmapId}/${nodeId}`);

const levelOfNode = (nodeId: string): number | undefined => {
  const m = nodeId.match(/^m(\d+)-/);
  return m ? Number(m[1]) : undefined;
};

const fileCache = new Map<number, StudyFile>();

async function loadLevel(level: number): Promise<StudyFile | undefined> {
  const cached = fileCache.get(level);
  if (cached) return cached;
  const loader = LEVEL_LOADERS[level];
  if (!loader) return undefined;
  const parsed = studyFileSchema.parse((await loader()).default);
  fileCache.set(level, parsed);
  return parsed;
}

export async function loadNodeStudy(roadmapId: string, nodeId: string): Promise<Record<string, StudyEntry> | undefined> {
  const level = levelOfNode(nodeId);
  if (level === undefined) return undefined;
  const file = await loadLevel(level);
  return file?.roadmapId === roadmapId ? file.nodes[nodeId] : undefined;
}

export async function noteFor(roadmapId: string, nodeId: string, checklistItem: string): Promise<StudyEntry | undefined> {
  const notes = await loadNodeStudy(roadmapId, nodeId);
  return notes?.[subtopicKey(checklistItem)];
}

export async function loadAllStudyFiles(): Promise<StudyFile[]> {
  const files = await Promise.all(Object.keys(LEVEL_LOADERS).map((k) => loadLevel(Number(k))));
  return files.filter((f): f is StudyFile => !!f);
}
