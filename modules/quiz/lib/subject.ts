import { problemBySlug, problems, subtopicById, topicById } from "@/core/content";
import { parseCaseRef } from "@/modules/design/domain/case-quiz";
import { subjectForTopic, type AskSubject } from "@/modules/ai/domain/ask-subjects";

/** Which of your Gemini projects fits a question, from where it came from: a subtopic id, a problem slug or a DSA pattern. */
export function askSubjectForRef(ref: string | undefined): AskSubject {
  if (!ref) return "general";
  const kase = parseCaseRef(ref);
  if (kase) return kase.kind;
  const sub = subtopicById.get(ref);
  if (sub) return subjectForTopic(sub.topicId, topicById.get(sub.topicId)?.track ?? sub.track);
  const problem = problemBySlug.get(ref);
  if (problem) return problem.track === "js" ? "js" : problem.track === "sql" ? "dbms" : "dsa";
  if (problems.some((p) => p.pattern === ref)) return "dsa";
  return "general";
}
