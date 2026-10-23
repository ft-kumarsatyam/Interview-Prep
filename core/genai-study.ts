/**
 * Typed access to the GenAI study notes (data/genai-study/*): quick-review notes and questions per roadmap
 * sub-topic. Add each new file to FILES. Not part of the syllabus, so the plan and streak never see it.
 */
import level3 from "@/data/genai-study/genai-16-levels/level-3.json";
import { studyFileSchema, subtopicKey, type StudyEntry, type StudyFile } from "@/modules/genai-study/domain/study";

/** Parsed through the schema so a malformed note fails loudly at load. */
export const studyFiles: StudyFile[] = [level3].map((j) => studyFileSchema.parse(j));

const byNode = new Map<string, Record<string, StudyEntry>>();
for (const f of studyFiles) for (const [nodeId, notes] of Object.entries(f.nodes)) byNode.set(`${f.roadmapId}/${nodeId}`, notes);

/** The notes of one node, keyed by sub-topic key, or undefined when none are written yet. */
export const nodeStudy = (roadmapId: string, nodeId: string): Record<string, StudyEntry> | undefined => byNode.get(`${roadmapId}/${nodeId}`);

/** The note for one checklist item of a node. */
export const noteFor = (roadmapId: string, nodeId: string, checklistItem: string): StudyEntry | undefined => nodeStudy(roadmapId, nodeId)?.[subtopicKey(checklistItem)];
