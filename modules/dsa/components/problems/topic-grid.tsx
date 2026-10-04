"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { TopicProgress } from "@/modules/dsa/domain/topic-progress";

const DIFF_CLASS = { Easy: "text-success", Medium: "text-warning", Hard: "text-destructive" } as const;
const SORTS = [
  { id: "order", label: "Plan order" },
  { id: "least", label: "Least done" },
  { id: "most", label: "Most done" },
] as const;
type Sort = (typeof SORTS)[number]["id"];

const pct = (t: TopicProgress) => (t.total === 0 ? 0 : Math.round((t.solved / t.total) * 100));

function TopicCard({ t }: { t: TopicProgress }) {
  const done = t.total > 0 && t.solved === t.total;
  return (
    <Card size="sm" className="min-w-0">
      <CardContent className="flex h-full flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
            {done && <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="All solved" />}
            <span className="truncate">{t.topic}</span>
          </h3>
          <p className="shrink-0 font-mono text-sm tabular-nums">
            {t.solved}
            <span className="text-muted-foreground">/{t.total}</span>
          </p>
        </div>
        <Progress value={pct(t)} aria-label={`${t.topic} progress`} />
        <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {(["Easy", "Medium", "Hard"] as const)
            .filter((d) => t.difficulty[d].total > 0)
            .map((d) => (
              <span key={d}>
                <span className={DIFF_CLASS[d]}>{d[0]}</span> {t.difficulty[d].solved}/{t.difficulty[d].total}
              </span>
            ))}
          {t.core > 0 && t.core < t.total && (
            <span>
              Core {t.coreSolved}/{t.core}
            </span>
          )}
          {t.custom > 0 && <span>+{t.custom} yours</span>}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-1">
          {t.next ? (
            <Link
              href={`/dsa/${t.next.slug}`}
              className="min-w-0 flex-1 truncate text-xs hover:underline focus-visible:underline focus-visible:outline-none"
              title={`Next: ${t.next.title}`}
            >
              <span className="text-muted-foreground">Next:</span> {t.next.title}
            </Link>
          ) : (
            <span className="flex-1 text-xs text-success">All done</span>
          )}
          <Link href={`/dsa?${t.query}`} className="flex shrink-0 items-center gap-0.5 text-xs text-primary hover:underline focus-visible:underline focus-visible:outline-none">
            All <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** Every sheet topic with its progress and next problem, filterable on the client. */
export function TopicGrid({ topics }: { topics: TopicProgress[] }) {
  const [q, setQ] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const [sort, setSort] = useState<Sort>("order");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = topics.filter((t) => (!needle || t.topic.toLowerCase().includes(needle)) && (!hideDone || t.solved < t.total));
    if (sort === "least") return list.toSorted((a, b) => pct(a) - pct(b));
    if (sort === "most") return list.toSorted((a, b) => pct(b) - pct(a));
    return list;
  }, [topics, q, hideDone, sort]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a topic" aria-label="Find a topic" className="pl-8" />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Sort topics">
          {SORTS.map((s) => (
            <Button key={s.id} size="sm" variant={sort === s.id ? "secondary" : "ghost"} aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>
              {s.label}
            </Button>
          ))}
        </div>
        <Button size="sm" variant={hideDone ? "secondary" : "ghost"} aria-pressed={hideDone} onClick={() => setHideDone((v) => !v)}>
          Hide finished
        </Button>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">No topic matches.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <TopicCard key={t.topic} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
