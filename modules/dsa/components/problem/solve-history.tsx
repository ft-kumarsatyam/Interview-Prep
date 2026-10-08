import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/core/plan-clock";
import type { ProblemDetail } from "@/modules/dsa/services/problems";

/** Last-solve summary and the full review history for a problem. */
export function SolveHistory({ progress, solved, onLeetCode = true }: { progress: ProblemDetail["progress"]; solved: boolean; onLeetCode?: boolean }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Last solve</CardTitle>
        </CardHeader>
        <CardContent>
          {solved ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Confidence" value={progress?.needsDetails ? "not rated" : (progress?.confidence ?? "—")} />
              <Stat label="Minutes" value={progress?.timeTakenMin != null ? String(progress.timeTakenMin) : "—"} />
              <Stat label="Time" value={progress?.timeComplexity || "—"} mono />
              <Stat label="Space" value={progress?.spaceComplexity || "—"} mono />
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Approach</dt>
                <dd className="text-pretty">{progress?.approach || "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Next review</dt>
                <dd>{progress?.nextReviewAt ? formatDate(progress.nextReviewAt) : "Not scheduled"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              {onLeetCode ? "Not solved yet. Solve it here, submit it on LeetCode, then tap Mark solved." : "Not solved yet. Pass every test with Submit, or tap Mark solved."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review history</CardTitle>
        </CardHeader>
        <CardContent>
          {progress?.solveDates.length ? (
            <ol className="relative space-y-3 border-l pl-4">
              {progress.solveDates.map((d, i) => (
                <li key={d} className="text-sm">
                  <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-card bg-primary" aria-hidden />
                  <span className="font-medium">{i === 0 ? "First solve" : `Re-solve ${i}`}</span>
                  <span className="block text-xs text-muted-foreground">{formatDate(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No solves logged yet. Each solve and re-solve shows up here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono" : undefined}>{value}</dd>
    </div>
  );
}
