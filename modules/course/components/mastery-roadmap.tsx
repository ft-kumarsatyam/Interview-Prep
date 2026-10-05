import Link from "next/link";
import { CheckCircle2, RotateCcw, Target } from "lucide-react";
import { ToneBadge } from "@/components/shared/tone-badge";
import type { MasteryRoadmap } from "@/modules/course/domain/course";

type MasteryRoadmapProps = {
  roadmap: MasteryRoadmap;
};

export function MasteryRoadmap({ roadmap }: MasteryRoadmapProps) {
  const byId = new Map(roadmap.problems.map((problem) => [problem.id, problem]));

  return (
    <section aria-labelledby="mastery-roadmap-title" className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div>
        <div className="flex items-center gap-2">
          <Target className="size-4 text-primary" aria-hidden />
          <h2 id="mastery-roadmap-title" className="text-base font-semibold">Pattern mastery roadmap</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{roadmap.goal}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg bg-muted/50 p-3">
          <h3 className="text-sm font-semibold">Recognition map</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {roadmap.recognitionMap.map((item) => (
              <li key={`${item.pattern}-${item.signal}`} className="space-y-1">
                <p><span className="font-medium">{item.signal}</span> → {item.pattern}</p>
                <div className="flex flex-wrap gap-1">
                  {item.tools.map((tool) => <ToneBadge key={tool} tone="neutral">{tool}</ToneBadge>)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-primary/5 p-3">
          <h3 className="text-sm font-semibold text-primary">Done means</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {roadmap.doneWhen.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Solve in order</h3>
        <ol className="space-y-3">
          {roadmap.phases.map((phase, index) => (
            <li key={phase.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-medium">{index + 1}. {phase.title}</h4>
                <span className="text-xs text-muted-foreground">{phase.problemIds.length} problems</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{phase.focus}</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {phase.problemIds.map((problemId) => {
                  const problem = byId.get(problemId);
                  if (!problem) return null;
                  return (
                    <li key={problem.id}>
                      {problem.slug ? (
                        <Link href={`/dsa/${problem.slug}`} className="flex min-h-9 items-center justify-between gap-2 rounded-md px-2 text-sm hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span>{problem.prompt}</span>
                          <ToneBadge tone={problem.level === "Easy" ? "success" : problem.level === "Medium" ? "warning" : "danger"}>{problem.level}</ToneBadge>
                        </Link>
                      ) : (
                        <div className="flex min-h-9 items-center justify-between gap-2 rounded-md px-2 text-sm">
                          <span>{problem.prompt}</span>
                          <ToneBadge tone={problem.level === "Easy" ? "success" : problem.level === "Medium" ? "warning" : "danger"}>{problem.level}</ToneBadge>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><RotateCcw className="size-4" aria-hidden /> Re-solve checkpoints</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {roadmap.reruns.map((rerun) => (
              <li key={rerun.after}>
                <span className="font-medium">{rerun.after}:</span> {rerun.objective}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border p-3">
          <h3 className="text-sm font-semibold">Interview execution checklist</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {roadmap.interviewChecklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
