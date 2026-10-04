import Link from "next/link";
import { BookOpen, FilePlus2 } from "lucide-react";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Readiness, StudyStep } from "@/modules/jobs/domain/job-readiness";

export interface ReadinessCardProps {
  readiness: Readiness;
  plan: Array<StudyStep & { closes: string[] }>;
  hasResume: boolean;
}

/** Your fit for one job: skills you can claim (resume or studied), quick wins to add to the resume, and what to study next. */
export function ReadinessCard({ readiness: r, plan, hasResume }: ReadinessCardProps) {
  if (r.required.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Your readiness</CardTitle>
          <CardDescription>This posting doesn&apos;t list skills PrepOS recognises, so there is nothing to compare yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Your readiness</CardTitle>
        <CardDescription>
          You can claim <span className="tabular font-mono font-semibold text-foreground">{r.readyPct}%</span> of the {r.required.length} skills it asks for
          {hasResume ? ` (${r.resumePct}% already on your resume)` : ", but you have no resume saved yet"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {r.addToResume.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-info">
              <FilePlus2 className="size-3.5" aria-hidden /> You&apos;ve studied these: add them to your resume
            </p>
            <ul className="space-y-1">
              {r.addToResume.map((a) => (
                <li key={a.term} className="flex flex-wrap items-center gap-x-2">
                  <ToneBadge tone="info">{a.term}</ToneBadge>
                  <span className="text-xs text-muted-foreground">from {a.via.topicTitle}: {a.via.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {plan.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-warning">
              <BookOpen className="size-3.5" aria-hidden /> Study next to close the gap
            </p>
            <ul className="space-y-1.5">
              {plan.map((s) => (
                <li key={s.id}>
                  <Link href={`/learn/${s.topicId}`} className="underline-offset-2 hover:underline">
                    {s.topicTitle}: {s.title}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">covers {s.closes.join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {r.outsideSyllabus.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Not in your syllabus</p>
            <ul className="flex flex-wrap gap-1">
              {r.outsideSyllabus.map((t) => (
                <li key={t}>
                  <ToneBadge>{t}</ToneBadge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
