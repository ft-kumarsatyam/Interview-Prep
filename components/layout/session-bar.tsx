"use client";

import { usePathname } from "next/navigation";
import { ArrowRight, Check, Lock, PartyPopper } from "lucide-react";
import { buildSession } from "@/core/domain/session";
import type { NavBadges, NavToday } from "@/core/services/nav";
import { cn } from "@/core/utils";
import { StudyActionLink } from "@/components/shared/study-action-link";

const SHOW_ON = ["/dashboard", "/quiz", "/review"];

/** The daily loop at a glance on the Quiz and Review pages: where you are and what to do next. */
export function SessionBar({ today, badges }: { today: NavToday | null; badges: NavBadges }) {
  const pathname = usePathname().replace(/\/$/, "");
  if (!SHOW_ON.includes(pathname)) return null;
  const session = buildSession(today, badges["/review"] ?? 0);
  if (!session) return null;
  return (
    <section aria-label="Today's session" className="mb-4 rounded-xl border bg-card p-3 ring-1 ring-foreground/5">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
        {session.steps.map((s, i) => {
          const current = session.next?.id === s.id;
          return (
            <li key={s.id} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden className="mx-1 h-px w-3 bg-border" />}
              <StudyActionLink
                href={s.href}
                title={s.label}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  s.done ? "text-success" : current ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground",
                )}
              >
                {s.done ? <Check className="size-3.5" aria-hidden /> : s.locked ? <Lock className="size-3.5" aria-hidden /> : <span aria-hidden className="size-1.5 rounded-full bg-current" />}
                {s.label}
                <span className="tabular font-mono text-2xs opacity-80">{s.detail}</span>
              </StudyActionLink>
            </li>
          );
        })}
        <li className="ml-auto">
          {session.next ? (
            <StudyActionLink
              href={session.next.href}
              title={session.next.label}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Next: {session.next.label} <ArrowRight className="size-4" aria-hidden />
            </StudyActionLink>
          ) : session.doneCount === session.steps.length ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
              <PartyPopper className="size-4" aria-hidden /> Session complete
            </span>
          ) : null}
        </li>
      </ol>
    </section>
  );
}
