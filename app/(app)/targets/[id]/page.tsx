import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Circle, Pin } from "lucide-react";
import { PinButton } from "@/components/targets/pin-button";
import { TargetSettings } from "@/components/targets/target-settings";
import { BackLink } from "@/components/shared/back-link";
import { DifficultyBadge } from "@/components/shared/badges";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatTile } from "@/components/shared/stat-tile";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { tierProfiles } from "@/lib/content";
import { PRIORITY_LABEL } from "@/lib/domain/companies";
import { getTargetDetail } from "@/lib/services/targets";

export const metadata: Metadata = { title: "Target" };

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
const STATUS_LABEL = { new: "not started", studying: "in progress", practised: "practised", mastered: "mastered" } as const;

export default async function TargetPage({ params }: PageProps<"/targets/[id]">) {
  const { id } = await params;
  const detail = await getTargetDetail(decodeURIComponent(id));
  if (!detail) notFound();
  const { target, profile, blueprint: bp, gaps } = detail;
  const solved = bp.problems.filter((p) => p.done).length;

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/targets">Targets</BackLink>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{target.name}</h1>
          <ToneBadge tone={target.priority === "dream" ? "primary" : target.priority === "target" ? "info" : "neutral"}>{PRIORITY_LABEL[target.priority]}</ToneBadge>
          <span className="text-sm text-muted-foreground">{profile.name}</span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">{profile.blurb}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Readiness" value={`${bp.overall}%`} tone={bp.overall >= 70 ? "success" : bp.overall >= 40 ? "warning" : "danger"} hint="weighted for this kind of company" />
        <StatTile label="DSA set" value={`${solved}/${bp.problems.length}`} hint={`${bp.byDifficulty.Hard.done}/${bp.byDifficulty.Hard.total} hard`} />
        <StatTile label="Design cases" value={`${bp.cases.filter((c) => c.done).length}/${bp.cases.length}`} />
        <StatTile label="Next up" value={String(gaps.length)} hint="gaps in your backlog" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Interview rounds</CardTitle>
            <CardDescription>What this kind of company usually runs. Individual teams differ.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {profile.rounds.map((r, i) => (
                <li key={r.name} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">{i + 1}</span>
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium">{r.name}</span>
                    <span className="block text-muted-foreground">{r.focus}</span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readiness by area</CardTitle>
            <CardDescription>Areas weighted by how much this kind of company tests them.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {bp.areas.toSorted((a, b) => b.weight - a.weight).map((a) => (
                <li key={a.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{a.label}</span>
                    <span className="tabular font-mono text-xs text-muted-foreground">
                      {a.done}/{a.total} · {a.pct}%
                    </span>
                  </div>
                  <Progress value={a.pct} aria-label={`${a.label} readiness`} className="h-1.5" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {gaps.length > 0 && (
        <section aria-label="Next up">
          <SectionHeading title="Next up for this company" hint="These also sit in your backlog, ranked by priority" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {gaps.map((g) => (
              <li key={g.key}>
                <Link href={g.path} className="flex min-h-12 items-center gap-2 rounded-lg border bg-card px-3 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  <span className="min-w-0 flex-1 truncate font-medium">{g.title}</span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:inline">{g.note.split(" · ").slice(1).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="System design cases">
        <SectionHeading title="System design cases" hint={`${bp.cases.filter((c) => c.done).length} of ${bp.cases.length} practised`} />
        {bp.cases.length === 0 ? (
          <p className="text-sm text-muted-foreground">This kind of company rarely asks system design, so there is no case set.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {bp.cases.map((c) => (
              <li key={c.slug} className="flex min-h-12 items-center gap-2 rounded-lg border bg-card pr-1 pl-3">
                {c.done ? <Check className="size-4 shrink-0 text-success" aria-label="Practised" /> : <Circle className="size-4 shrink-0 text-muted-foreground" aria-label={STATUS_LABEL[c.status]} />}
                <Link href={`/design/${c.slug}`} className="min-w-0 flex-1 truncate text-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  {c.title}
                </Link>
                <span className="hidden text-xs text-muted-foreground sm:inline">{STATUS_LABEL[c.status]}</span>
                <PinButton id={target.id} kind="design" refId={c.slug} pinned={c.pinned} label={c.title} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="DSA set" className="space-y-3">
        <SectionHeading title="DSA set" hint="Built from your problem list for this kind of company. Pin your own to add more." />
        {DIFFICULTIES.map((d) => {
          const list = bp.problems.filter((p) => p.difficulty === d);
          if (list.length === 0) return null;
          const done = list.filter((p) => p.done).length;
          return (
            <details key={d} className="rounded-xl border bg-card" open={d === "Medium"}>
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <DifficultyBadge difficulty={d} /> {done} of {list.length} solved
              </summary>
              <ul className="divide-y border-t">
                {list.map((p) => (
                  <li key={p.slug} className="flex min-h-11 items-center gap-2 pr-1 pl-4">
                    {p.done ? <Check className="size-4 shrink-0 text-success" aria-label="Solved" /> : <Circle className="size-4 shrink-0 text-muted-foreground" aria-label="Not solved" />}
                    <Link href={`/dsa/${p.slug}`} className="min-w-0 flex-1 truncate text-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                      {p.title}
                    </Link>
                    {p.pinned && <Pin className="size-3.5 shrink-0 text-primary" aria-label="Pinned" />}
                    <span className="hidden truncate text-xs text-muted-foreground md:inline">{p.pattern}</span>
                    <PinButton id={target.id} kind="dsa" refId={p.slug} pinned={p.pinned} label={p.title} />
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </section>

      <section aria-label="Settings for this target">
        <SectionHeading title="About this target" />
        <Card>
          <CardContent className="pt-4">
            <TargetSettings id={target.id} name={target.name} tier={target.tier} priority={target.priority} interviewDate={target.interviewDate} notes={target.notes} tiers={tierProfiles} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
