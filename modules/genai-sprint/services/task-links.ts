import { hasCourseLesson } from "@/core/courses";
import { genaiPrepMapping } from "@/core/genai-prep-pack";
import { knownRoadmap } from "@/core/roadmaps";

const mappingByTask = new Map(genaiPrepMapping.tasks.map((t) => [t.taskId, t]));

export function linksForTask(taskId: string): { course?: string; roadmap?: string; project?: string } {
  const m = mappingByTask.get(taskId);
  if (!m) return {};
  const out: { course?: string; roadmap?: string; project?: string } = {};
  if (m.courseLesson && hasCourseLesson(m.courseLesson)) {
    const [courseId, lessonId] = m.courseLesson.split("/") as [string, string];
    out.course = `/courses/${courseId}/${lessonId}`;
  }
  if (m.roadmapNode && knownRoadmap("ai-engineer")) {
    out.roadmap = `/roadmaps/ai-engineer#${m.roadmapNode}`;
  }
  if (m.projectId) out.project = `/genai-sprint/projects/${m.projectId}`;
  return out;
}
