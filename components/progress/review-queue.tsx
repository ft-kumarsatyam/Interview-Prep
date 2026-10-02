"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { AlarmClock, ArrowRight, CalendarCheck, CheckCircle2, ExternalLink, Frown, Loader2, Meh, PartyPopper, Smile } from "lucide-react";
import { toast } from "sonner";
import { markSolved } from "@/app/(app)/dashboard/actions";
import { celebrateDayComplete } from "@/components/shared/celebrate";
import { DifficultyBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { diffDays, type DateStr } from "@/lib/domain/dates";
import type { ReviewItem } from "@/lib/services/problems";
import { cn } from "@/lib/utils";

const RATINGS = [
  { id: "easy", label: "Easy", icon: Smile, className: "hover:border-success/50 hover:bg-success/10 [&_svg]:text-success" },
  { id: "ok", label: "OK", icon: Meh, className: "hover:border-primary/50 hover:bg-primary/10 [&_svg]:text-primary" },
  { id: "struggled", label: "Struggled", icon: Frown, className: "hover:border-warning/50 hover:bg-warning/10 [&_svg]:text-warning" },
] as const;

type Confidence = (typeof RATINGS)[number]["id"];

interface Rated {
  slug: string;
  title: string;
  confidence: Confidence;
}

export function ReviewQueue({ items, today }: { items: ReviewItem[]; today: DateStr }) {
  const [, startTransition] = useTransition();
  /** Saved this visit. Kept locally because a re-solve moves the problem out of the server's due list. */
  const [saved, setSaved] = useState<Rated[]>([]);
  const [pending, addPending] = useOptimistic<Rated[], Rated>([], (list, r) => [...list, r]);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());

  const handled = new Set([...saved, ...pending].map((r) => r.slug));
  const remaining = items.filter((i) => !i.solvedToday && !handled.has(i.slug));
  const earlier = items.filter((i) => i.solvedToday && !handled.has(i.slug));
  const doneCount = handled.size + earlier.length;
  const total = doneCount + remaining.length;

  function rate(item: ReviewItem, confidence: Confidence) {
    startTransition(async () => {
      addPending({ slug: item.slug, title: item.title, confidence });
      const res = await markSolved({ slug: item.slug, confidence });
      if (!res.ok) {
        toast.error(`Couldn't save ${item.title}: ${res.error}. Rate it again.`);
        return;
      }
      setSaved((s) => [...s, { slug: item.slug, title: item.title, confidence }]);
      toast.success(`${item.title}: re-solved (${confidence})`);
      if (res.justCompleted) await celebrateDayComplete();
    });
  }

  if (total === 0) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="Nothing due. 🎉"
        action={
          <Button size="lg" asChild>
            <Link href="/dsa">
              Practice new problems <ArrowRight />
            </Link>
          </Button>
        }
      >
        Reviews show up here 3, 7 or 21 days after a struggled solve, and 14 days after an OK one.
      </EmptyState>
    );
  }

  const savedSlugs = new Set(saved.map((r) => r.slug));
  const doneList: Array<Rated & { saving: boolean }> = [
    ...pending.filter((r) => !savedSlugs.has(r.slug)).map((r) => ({ ...r, saving: true })),
    ...saved.toReversed().map((r) => ({ ...r, saving: false })),
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card p-4 ring-1 ring-white/5" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">
            <span className="tabular font-mono text-lg">{doneCount}</span> <span className="text-muted-foreground">of {total} done today</span>
          </p>
          <p className={cn("text-sm", remaining.length === 0 ? "text-success" : "text-muted-foreground")}>
            {remaining.length === 0 ? "All done 🎉" : `${remaining.length} to go 💪`}
          </p>
        </div>
        <Progress value={(doneCount / total) * 100} className="mt-3 h-1.5" aria-label="Reviews done today" />
      </section>

      {remaining.length === 0 ? (
        <EmptyState
          compact
          icon={PartyPopper}
          title="All reviews done for today 🎉"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="lg" asChild>
                <Link href="/dashboard">Back to today</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dsa">Practice new problems</Link>
              </Button>
            </div>
          }
        >
          Nice work keeping these fresh.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {remaining.map((item) => (
            <ReviewCard
              key={item.slug}
              item={item}
              today={today}
              opened={opened.has(item.slug)}
              onOpen={() => setOpened((s) => new Set(s).add(item.slug))}
              onRate={(c) => rate(item, c)}
            />
          ))}
        </ul>
      )}

      {(doneList.length > 0 || earlier.length > 0) && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Done today</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {doneList.map((r) => (
              <li key={r.slug} className="flex min-h-12 items-center gap-3 px-4 py-2 text-sm">
                {r.saving ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                )}
                <Link href={`/dsa/${r.slug}`} className="min-w-0 flex-1 truncate hover:text-primary">
                  {r.title}
                </Link>
                <span className="text-xs text-muted-foreground">{r.saving ? "Saving…" : r.confidence}</span>
              </li>
            ))}
            {earlier.map((i) => (
              <li key={i.slug} className="flex min-h-12 items-center gap-3 px-4 py-2 text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                <Link href={`/dsa/${i.slug}`} className="min-w-0 flex-1 truncate hover:text-primary">
                  {i.title}
                </Link>
                <span className="text-xs text-muted-foreground">solved today</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReviewCard({
  item,
  today,
  opened,
  onOpen,
  onRate,
}: {
  item: ReviewItem;
  today: DateStr;
  opened: boolean;
  onOpen: () => void;
  onRate: (c: Confidence) => void;
}) {
  const overdue = diffDays(today, item.nextReviewAt);
  const ratingLabel = `rate-${item.slug}`;
  return (
    <li className={cn("flex flex-col gap-4 rounded-xl border bg-card p-4 ring-1 ring-white/5 transition-colors", opened && "border-primary/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/dsa/${item.slug}`} className="line-clamp-2 font-medium hover:text-primary">
            {item.title}
          </Link>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <DifficultyBadge difficulty={item.difficulty} />
            <span>{item.pattern}</span>
          </p>
        </div>
        {overdue > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 text-xs font-medium text-warning">
            <AlarmClock className="size-3.5" aria-hidden /> {overdue}d overdue
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <CalendarCheck className="size-3.5" aria-hidden /> Due today
          </span>
        )}
      </div>

      <p className="-mt-2 text-xs text-muted-foreground">
        Last time: <span className={cn("font-medium", item.confidence === "struggled" ? "text-warning" : "text-foreground")}>{item.confidence ?? "not rated"}</span> · review #
        {item.reviewCount + 1}
      </p>

      <Button size="lg" variant={opened ? "outline" : "default"} className="h-10 w-full" asChild>
        <a href={item.url} target="_blank" rel="noreferrer" onClick={onOpen}>
          {opened ? <CheckCircle2 /> : <span className="font-mono text-xs opacity-70">1</span>}
          {opened ? "Opened on LeetCode" : "Open on LeetCode"}
          <ExternalLink />
        </a>
      </Button>

      <div>
        <p id={ratingLabel} className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="font-mono opacity-70">2</span> Re-solved? How did it go:
        </p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby={ratingLabel}>
          {RATINGS.map((r) => (
            <Button key={r.id} type="button" variant="outline" className={cn("h-10 gap-1.5 px-2", r.className)} onClick={() => onRate(r.id)}>
              <r.icon aria-hidden />
              {r.label}
            </Button>
          ))}
        </div>
      </div>
    </li>
  );
}
