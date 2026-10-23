import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Progress } from "@/components/ui/progress";
import { READINESS_DOMAINS } from "@/modules/genai-playbook/domain/schemas";
import { StartTestButton } from "@/modules/genai-test/components/start-test-button";
import { getHomeView } from "@/modules/genai-test/services/test";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "GenAI tests" };

export default async function GenaiTestHomePage() {
  const home = await getHomeView(todayIn(await getSettings()));
  const open = home.attempts.find((a) => a.status === "in_progress");

  return (
    <div className="space-y-8">
      <PageHeader
        icon={ClipboardCheck}
        title="GenAI tests"
        description="A weekly test of MCQs and written answers: this week's topics plus review from earlier weeks. Tests never change your daily plan, streak or daily quiz."
      />
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Week {home.weekIdx} of 23 · {home.weekId.toUpperCase()}
        </p>
        <p className="font-medium">{home.weekTitle}</p>
        <p className="text-sm text-muted-foreground">Focus: {home.weekFocus}. Pass mark this week: {home.passMark}% (it rises from 60% to 75% as more is expected).</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Syllabus covered vs due by this week</span>
            <span className="font-mono tabular">{home.expected.expected ? `${home.expected.covered}/${home.expected.expected} · ${home.expected.pct}%` : "-"}</span>
          </div>
          <Progress value={home.expected.pct} className="h-1.5" aria-label="Syllabus covered against what is due" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {open ? (
            <Link href={`/genai-test/${open.id}`} className="text-sm text-primary underline-offset-4 hover:underline">
              Resume {open.slug}
            </Link>
          ) : null}
          <StartTestButton kind="weekly" label="Start this week's test" />
          <StartTestButton kind="cumulative" label="Cumulative random test" variant="outline" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Levels 0 to 15</h2>
        <p className="text-sm text-muted-foreground">
          {home.levelReached >= 0 ? `Level reached: ${home.levelReached} (80% covered and 70% mastery on every level up to it).` : "No level cleared yet: a level clears at 80% covered and 70% mastery."}
        </p>
        <ul className="space-y-2">
          {home.levels.map((l) => (
            <li key={l.level} className="space-y-1 rounded-md border px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">Level {l.level}</span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Covered <span className="font-mono tabular text-foreground">{l.coverage.pct}%</span>
                  </span>
                  <span>
                    Mastery <span className="font-mono tabular text-foreground">{l.mastery === null ? "-" : `${l.mastery}%`}</span>
                  </span>
                  <StartTestButton kind="level" level={l.level} label="Test" variant="outline" />
                </span>
              </div>
              <Progress value={l.coverage.pct} className="h-1" aria-label={`Level ${l.level} covered`} />
            </li>
          ))}
        </ul>
      </section>

      {home.weakest.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Weakest so far: {home.weakest.map((w) => `Level ${w.level} (${w.mastery}%)`).join(", ")}. Take a level test on each, then reread its notes.
        </p>
      )}

      {Object.keys(home.suggestedReadiness).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Suggested Sunday readiness</h2>
          <p className="text-sm text-muted-foreground">From your test results. This is a hint only: score yourself on the playbook Reviews page.</p>
          <ul className="flex flex-wrap gap-2 text-xs">
            {READINESS_DOMAINS.filter((d) => d.id in home.suggestedReadiness).map((d) => (
              <li key={d.id} className="rounded-md border px-2 py-1">
                {d.label}: <span className="font-mono tabular">{home.suggestedReadiness[d.id]}/5</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {home.trend.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Weekly score trend</h2>
          <ul className="flex flex-wrap gap-2 text-xs">
            {home.trend.map((t) => (
              <li key={t.weekId} className="rounded-md border px-2 py-1">
                {t.weekId.toUpperCase()}: <span className="font-mono tabular">{t.pct}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">History</h2>
        {home.attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tests yet.</p>
        ) : (
          <ul className="space-y-1">
            {home.attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <Link href={`/genai-test/${a.id}`} className="hover:text-primary">
                  {a.slug} · {a.startedOn}
                </Link>
                {a.status === "in_progress" ? <ToneBadge tone="warning">In progress</ToneBadge> : a.pending ? <ToneBadge tone="warning">Needs grading</ToneBadge> : <ToneBadge tone={a.passed ? "success" : "neutral"}>{`${a.pct}%`}</ToneBadge>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
