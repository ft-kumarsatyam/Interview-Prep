import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarClock, Code2, Flame, ListChecks, Newspaper } from "lucide-react";
import { TrackChip } from "@/components/shared/badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { problems, topics, tracks } from "@/lib/content";
import { PHASES } from "@/lib/domain/plan-config";
import { formatDate, planClock } from "@/lib/plan-clock";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(timeZone: string): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const timezone = process.env.APP_TIMEZONE || "Asia/Kolkata";
  const clock = planClock();
  const focusWeek = Math.max(clock.week, 1);
  const trackById = new Map(tracks.map((t) => [t.id, t]));
  const weekTopics = topics.filter((t) => t.week === focusWeek);
  const counts = {
    main: problems.filter((p) => p.track === "main").length,
    core: problems.filter((p) => p.track === "main" && p.tier === "core").length,
    js: problems.filter((p) => p.track === "js").length,
    sql: problems.filter((p) => p.track === "sql").length,
    subtopics: topics.reduce((n, t) => n + t.subtopics.length, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(timezone)}, {process.env.ADMIN_NAME || "there"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(clock.today, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
          {clock.week === 0
            ? `Plan starts in ${clock.daysUntilStart} day${clock.daysUntilStart === 1 ? "" : "s"}`
            : `Week ${clock.week} of ${clock.totalWeeks} · ${clock.phase?.name}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarClock} label="Countdown" value={`${clock.daysLeft}d`} hint="to Sun 21 Mar 2027" />
        <StatCard icon={Code2} label="DSA in JavaScript" value={String(counts.main)} hint={`${counts.core} core first · +${counts.js} JS · +${counts.sql} SQL`} />
        <StatCard icon={BookOpen} label="Theory" value={String(counts.subtopics)} hint={`subtopics across ${topics.length} topics`} />
        <StatCard icon={Flame} label="Streak" value="—" hint="Starts with your first complete day" accent />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{clock.week === 0 ? "Week 1 preview" : `This week · Week ${focusWeek}`}</CardTitle>
            <CardDescription>Theory topics scheduled for the week. Full checklists live in Learn.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {weekTopics.map((t) => {
              const track = trackById.get(t.track);
              return (
                <Link
                  key={t.id}
                  href={`/learn?track=${t.track}`}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.subtopics.length} subtopics</p>
                  </div>
                  {track && <TrackChip color={track.color}>{track.name}</TrackChip>}
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s loop</CardTitle>
            <CardDescription>The live checklist, streak and quiz gate arrive in Phases 3–5.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <LoopRow icon={BookOpen} title="Learn" detail="2–3 theory subtopics" href="/learn" />
            <LoopRow icon={Code2} title="Solve in JavaScript" detail={clock.week <= 2 ? "2 problems + 1 JS-track problem" : "Adaptive target"} href="/dsa" />
            <LoopRow icon={Newspaper} title="Read" detail="2–3 AI & engineering articles" href="/news" />
            <LoopRow icon={ListChecks} title="Pass the daily quiz" detail="10 MCQs · ≥ 60% completes the day" href="/quiz" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roadmap</CardTitle>
          <CardDescription>24 weeks, zero → interview-ready.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={(Math.max(clock.week - 1, 0) / clock.totalWeeks) * 100} aria-label="Plan progress" />
          <ol className="grid gap-3 md:grid-cols-5">
            {PHASES.map((p) => {
              const current = clock.phase?.id === p.id;
              return (
                <li key={p.id} className={cn("rounded-lg border p-3", current && "border-primary bg-primary/5")}>
                  <p className="font-mono text-xs text-muted-foreground">
                    Wk {p.fromWeek}–{p.toWeek}
                  </p>
                  <p className="mt-1 text-sm font-medium">{p.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.outcome}</p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, accent }: { icon: typeof Flame; label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="tabular mt-1 font-mono text-3xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <Icon className={cn("size-5 text-muted-foreground", accent && "text-streak")} />
      </CardContent>
    </Card>
  );
}

function LoopRow({ icon: Icon, title, detail, href }: { icon: typeof Flame; title: string; detail: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted">
      <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </Link>
  );
}
