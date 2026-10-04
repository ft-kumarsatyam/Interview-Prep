import Link from "next/link";
import { ArrowRight, Check, Inbox } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { minutesLabel } from "@/modules/progress/domain/backlog-items";

export interface BacklogCardData {
  owed: number;
  minutes: number;
  budget: number;
  queueDone: number;
  queue: Array<{ key: string; title: string; path: string; note?: string }>;
}

/** The dashboard's backlog summary: what is queued for today and how much is owed in all. Optional work, never part of the streak. */
export function BacklogCard({ data }: { data: BacklogCardData }) {
  if (data.owed === 0 && data.queue.length === 0 && data.queueDone === 0) return null;
  return (
    <Card id="backlog" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="size-4 text-muted-foreground" aria-hidden /> Backlog
        </CardTitle>
        <CardDescription>
          {data.owed} owed, about {minutesLabel(data.minutes)}. {data.budget > 0 ? `${data.queue.length + data.queueDone} queued for today. Optional, never affects your streak.` : "The automatic daily queue is off."}
        </CardDescription>
        <CardAction>
          <Link href="/backlog" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            All <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {data.queue.length > 0 ? (
          <ul className="space-y-1">
            {data.queue.map((q) => (
              <li key={q.key}>
                <Link href={q.path} className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  <span className="min-w-0 flex-1 truncate">{q.title}</span>
                  {q.note && <span className="hidden truncate text-xs text-muted-foreground sm:inline">{q.note}</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
            {data.queueDone > 0 ? (
              <>
                <Check className="size-4 text-success" aria-hidden /> Today&apos;s queue is done.
              </>
            ) : (
              "Nothing queued today."
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
