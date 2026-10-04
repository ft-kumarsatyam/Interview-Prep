import { CheckCircle2, Gauge } from "lucide-react";
import { percent, type TopicStats } from "@/modules/aptitude/domain/aptitude/progress";
import type { AptitudeTopic } from "@/modules/aptitude/domain/aptitude/topics";
import { cn } from "@/core/utils";
import { LinkCard } from "@/components/shared/link-card";

const STATUS_LABEL = { new: "New", practising: "Practising", mastered: "Mastered" } as const;
const STATUS_CLASS = {
  new: "bg-muted text-muted-foreground",
  practising: "bg-warning/12 text-warning",
  mastered: "bg-success/12 text-success",
} as const;
const SPEED_CLASS = { fast: "text-success", ok: "text-warning", slow: "text-destructive" } as const;

export function TopicCard({ topic, stats }: { topic: AptitudeTopic; stats: TopicStats }) {
  return (
    <LinkCard href={`/aptitude/${topic.id}`} className="h-full flex-col items-stretch gap-2 p-4 hover:bg-primary/5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm leading-snug font-semibold text-balance">{topic.title}</h3>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLASS[stats.status])}>
          {stats.status === "mastered" && <CheckCircle2 className="size-3" aria-hidden />}
          {STATUS_LABEL[stats.status]}
        </span>
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{topic.summary}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground tabular-nums">
        {stats.attempted > 0 ? (
          <>
            <span>
              {percent(stats.accuracy)} accuracy · {stats.attempted} done
            </span>
            {stats.avgSec !== null && stats.speed && (
              <span className={cn("flex items-center gap-1", SPEED_CLASS[stats.speed])}>
                <Gauge className="size-3" aria-hidden />
                {stats.avgSec.toFixed(0)}s / {topic.targetSec}s
              </span>
            )}
          </>
        ) : (
          <span>Target {topic.targetSec}s per question</span>
        )}
      </div>
    </LinkCard>
  );
}
