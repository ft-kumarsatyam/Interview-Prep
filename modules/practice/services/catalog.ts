import { aptitudeBank, interviewFiles, practiceCases, problems, subtopics, systemDesign, topics } from "@/core/content";
import { connectDb } from "@/core/db";
import { ProblemProgress } from "@/core/models/progress";
import { WebInterviewProgress } from "@/core/models/webdev";
import { caseRef } from "@/modules/design/domain/case-quiz";
import { groupByStep } from "@/modules/dsa/domain/dsa-sheet";
import { buildCatalog, type CatalogInput, type PracticeEntry, type SubjectId } from "@/modules/practice/domain/catalog";
import { getMasteryMap } from "@/modules/progress/services/mastery";
import { getStudied } from "@/modules/progress/services/studied";
import { bank } from "@/modules/quiz/lib/bank";
import { getSettings } from "@/modules/settings/services/settings";

/** Which subject a web-interview track belongs to. Anything not listed is frontend or general web. */
const FLASHCARD_SUBJECT: Record<string, SubjectId> = {
  agents: "ai", "genai-eng": "ai", "llm-evals-ops": "ai", llm: "ai", "ml-foundations": "ai", rag: "ai",
  sql: "dbms", mongo: "dbms", distdb: "dbms",
  arch: "hld", "cloud-devops": "hld", observability: "hld", "sd-cases": "hld", "caching-queues": "hld",
  security: "networking", "auth-security": "networking", http: "networking", "http-apis": "networking",
  node: "node",
};

export interface PracticeCatalog {
  entries: PracticeEntry[];
  /** Topics you have studied (ticked subtopics or finished lessons). */
  studiedTopics: Set<string>;
}

/** Everything you can practise, with your progress. Read-only. */
export async function getPracticeCatalog(): Promise<PracticeCatalog> {
  await connectDb();
  const [mastery, studied, settings, solvedRows, webRows] = await Promise.all([
    getMasteryMap(),
    getStudied(),
    getSettings(),
    ProblemProgress.find({ status: "solved" }, { slug: 1 }).lean(),
    WebInterviewProgress.find({}, { qid: 1, status: 1 }).lean(),
  ]);
  const solved = new Set(solvedRows.map((r) => r.slug));
  const webStatus = new Map(webRows.map((r) => [r.qid, r.status]));

  const subtopicCount = new Map<string, number>();
  for (const s of subtopics) subtopicCount.set(s.topicId, (subtopicCount.get(s.topicId) ?? 0) + 1);
  const studiedPerTopic: Record<string, number> = {};
  for (const id of studied.subtopics) {
    const topicId = subtopics.find((s) => s.id === id)?.topicId;
    if (topicId) studiedPerTopic[topicId] = (studiedPerTopic[topicId] ?? 0) + 1;
  }

  const code: CatalogInput["code"] = groupByStep(problems.filter((p) => p.track === "main")).map((g) => ({
    id: `dsa:${g.step}`,
    subject: "dsa",
    title: g.step,
    total: g.problems.length,
    solved: g.problems.filter((p) => solved.has(p.slug)).length,
    href: "/dsa",
  }));
  for (const [track, subject, title] of [["js", "js", "JavaScript: 30 Days of JS"], ["sql", "dbms", "SQL problems"]] as const) {
    const own = problems.filter((p) => p.track === track);
    if (own.length) code.push({ id: `${track}:all`, subject, title, total: own.length, solved: own.filter((p) => solved.has(p.slug)).length, href: "/dsa" });
  }

  const input: CatalogInput = {
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      track: t.track,
      subtopics: subtopicCount.get(t.id) ?? 0,
      questions: subtopics.filter((s) => s.topicId === t.id).reduce((n, s) => n + (bank().bySubtopic.get(s.id)?.length ?? 0), 0),
    })),
    mastery,
    studiedPerTopic,
    passPct: settings.quizPassPct,
    cases: [
      ...systemDesign.cases.map((c) => ({ ref: caseRef("hld", c.slug), title: c.title, topicId: c.topicId, href: `/design/${c.slug}`, subject: "hld" as const, level: c.level })),
      ...practiceCases.map((c) => ({ ref: caseRef(c.kind, c.slug), title: c.title, topicId: c.topicId, href: `/design/${c.kind}/${c.slug}`, subject: (c.kind === "os" ? "os" : "dbms") as SubjectId, level: c.level })),
    ],
    code,
    flashcards: interviewFiles.map((f) => {
      const statuses = f.questions.map((q) => webStatus.get(q.id));
      return {
        id: f.track.id,
        subject: FLASHCARD_SUBJECT[f.track.id] ?? "web",
        title: f.track.name,
        total: f.questions.length,
        known: statuses.filter((s) => s === "known").length,
        review: statuses.filter((s) => s === "review").length,
        href: `/web/interview/${f.track.id}`,
      };
    }),
    aptitude: { total: Object.values(aptitudeBank as unknown as Record<string, unknown[]>).reduce((n, list) => n + list.length, 0), href: "/aptitude" },
  };

  const topicIds = new Set(Object.keys(studiedPerTopic));
  return { entries: buildCatalog(input), studiedTopics: topicIds };
}
