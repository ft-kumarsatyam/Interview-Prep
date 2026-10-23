/**
 * Typed access to the GenAI study notes (data/genai-study/*): quick-review notes and questions per roadmap
 * sub-topic. Add each new file to FILES. Not part of the syllabus, so the plan and streak never see it.
 */
import level0 from "@/data/genai-study/genai-16-levels/level-0.json";
import level1 from "@/data/genai-study/genai-16-levels/level-1.json";
import level2 from "@/data/genai-study/genai-16-levels/level-2.json";
import level3 from "@/data/genai-study/genai-16-levels/level-3.json";
import level4 from "@/data/genai-study/genai-16-levels/level-4.json";
import level5 from "@/data/genai-study/genai-16-levels/level-5.json";
import level6 from "@/data/genai-study/genai-16-levels/level-6.json";
import level7 from "@/data/genai-study/genai-16-levels/level-7.json";
import level8 from "@/data/genai-study/genai-16-levels/level-8.json";
import level9 from "@/data/genai-study/genai-16-levels/level-9.json";
import level10 from "@/data/genai-study/genai-16-levels/level-10.json";
import level11 from "@/data/genai-study/genai-16-levels/level-11.json";
import level12 from "@/data/genai-study/genai-16-levels/level-12.json";
import level13 from "@/data/genai-study/genai-16-levels/level-13.json";
import level15 from "@/data/genai-study/genai-16-levels/level-15.json";
import { studyFileSchema, subtopicKey, type StudyEntry, type StudyFile } from "@/modules/genai-study/domain/study";

/** Parsed through the schema so a malformed note fails loudly at load. */
export const studyFiles: StudyFile[] = [level0, level1, level2, level3, level4, level5, level6, level7, level8, level9, level10, level11, level12, level13, level15].map((j) => studyFileSchema.parse(j));

const byNode = new Map<string, Record<string, StudyEntry>>();
for (const f of studyFiles) for (const [nodeId, notes] of Object.entries(f.nodes)) byNode.set(`${f.roadmapId}/${nodeId}`, notes);

/** The notes of one node, keyed by sub-topic key, or undefined when none are written yet. */
export const nodeStudy = (roadmapId: string, nodeId: string): Record<string, StudyEntry> | undefined => byNode.get(`${roadmapId}/${nodeId}`);

/** The note for one checklist item of a node. */
export const noteFor = (roadmapId: string, nodeId: string, checklistItem: string): StudyEntry | undefined => nodeStudy(roadmapId, nodeId)?.[subtopicKey(checklistItem)];
