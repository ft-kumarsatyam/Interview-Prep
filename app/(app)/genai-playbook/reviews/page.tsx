import type { Metadata } from "next";
import { genaiPlaybookPlan as plan } from "@/core/genai-playbook";
import { focusDate, latestReadiness, mockAverage, weakDomains, weekForDate } from "@/modules/genai-playbook/domain/playbook";
import { MOCK_DIMENSIONS, READINESS_DOMAINS, READINESS_LEVELS } from "@/modules/genai-playbook/domain/schemas";
import { ReviewForm } from "@/modules/genai-playbook/components/review-form";
import { getPlaybookState } from "@/modules/genai-playbook/services/progress";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "GenAI playbook · Reviews" };

export default async function GenaiPlaybookReviewsPage() {
  const [state, settings] = await Promise.all([getPlaybookState(), getSettings()]);
  const week = weekForDate(plan, focusDate(plan, todayIn(settings)));
  if (!week) return null;
  const find = (kind: "readiness" | "mock") => state.reviews.find((r) => r.kind === kind && r.weekId === week.id);
  const readiness = find("readiness");
  const mock = find("mock");
  const latest = latestReadiness(state.reviews);
  const weak = weakDomains(latest);
  const mocks = state.reviews.filter((r) => r.kind === "mock").sort((a, b) => a.weekId.localeCompare(b.weekId));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-lg font-semibold">Sunday readiness · {week.id.toUpperCase()}</h1>
        <p className="text-sm text-muted-foreground">Score each gate honestly: 0 not studied, 1 recognize terms, 2 explain with notes, 3 explain closed-book, 4 implement or debug, 5 handle follow-ups and trade-offs. Aim for 3+ across core areas and 4+ on your strongest project. Below 3, book two focused sessions next week.</p>
        <ReviewForm kind="readiness" weekId={week.id} fields={READINESS_DOMAINS} min={0} initial={readiness?.scores ?? {}} initialNote={readiness?.note ?? ""} levels={READINESS_LEVELS} />
        {weak.length > 0 && <p className="text-sm text-warning">Below 3: {weak.map((id) => READINESS_DOMAINS.find((d) => d.id === id)?.label).join(", ")}.</p>}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Saturday mock scorecard · {week.id.toUpperCase()}</h2>
        <p className="text-sm text-muted-foreground">1 weak, 3 competent, 5 strong on each dimension.</p>
        <ReviewForm kind="mock" weekId={week.id} fields={MOCK_DIMENSIONS} min={1} initial={mock?.scores ?? {}} initialNote={mock?.note ?? ""} />
        {mocks.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {mocks.map((m) => (
              <li key={m.weekId}>
                {m.weekId.toUpperCase()}: average <span className="font-mono tabular text-foreground">{mockAverage(m.scores) ?? "-"}</span>
                {m.note ? ` · ${m.note}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
