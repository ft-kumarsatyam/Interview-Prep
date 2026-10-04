import { mainProblemCount, problemBySlug, subtopicById } from "@/lib/content";
import { env } from "@/lib/env";
import { pace } from "@/lib/domain/pace";
import { carryOverLine } from "@/lib/domain/recap";
import { morningDigest, type DigestLink } from "@/lib/domain/reminders";
import { loadBacklogMail } from "./backlog";
import { countSolvedMain } from "./dashboard";
import { listArticles, PREFETCH_CATEGORIES } from "./news";
import { carryOverFromYesterday } from "./recap";
import type { TodayState } from "./plan";

const READING_LIMIT = 5;

const problemLinks = (slugs: readonly (string | null)[]): DigestLink[] =>
  slugs.flatMap((slug) => {
    const p = slug ? problemBySlug.get(slug) : undefined;
    return p ? [{ title: p.title, path: `/dsa/${p.slug}`, note: p.difficulty }] : [];
  });

/** Today's morning email, built from the frozen plan, seed content and unread articles. */
export async function buildMorningDigest(state: Pick<TodayState, "today" | "plan" | "day" | "streak" | "settings">) {
  const { plan, settings, today } = state;
  const [articles, solvedMain, carried, backlog] = await Promise.all([
    listArticles({ filter: "unread", categories: PREFETCH_CATEGORIES, limit: READING_LIMIT }),
    countSolvedMain(),
    carryOverFromYesterday(today),
    loadBacklogMail({ today, plan, settings }),
  ]);
  const digest = morningDigest({
    date: today,
    day: state.day,
    streak: state.streak,
    problems: problemLinks([...plan.dsaNew, plan.jsProblem, plan.sqlProblem]),
    reviews: problemLinks(plan.dsaReview),
    theory: plan.theory.flatMap((id) => {
      const s = subtopicById.get(id);
      return s ? [{ title: s.title, path: `/learn/${s.topicId}`, note: s.topicTitle }] : [];
    }),
    reading: articles.map((a) => ({
      title: a.title,
      path: `/news/${a.id}`,
      note: a.readingMinutes ? `${a.sourceName} · ${a.readingMinutes} min` : a.sourceName,
    })),
    pace: pace(today, solvedMain, mainProblemCount, settings),
    carryOver: carried ? carryOverLine(carried.gap, carried.kind) : null,
    backlog,
    appUrl: env().APP_URL,
  });
  // The backlog total rides along so the roast can talk about the real number.
  return digest ? { ...digest, backlogTotal: backlog.total } : null;
}
