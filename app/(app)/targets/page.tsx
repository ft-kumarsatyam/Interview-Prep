import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Target as TargetIcon } from "lucide-react";
import { AddTarget } from "@/modules/targets/components/add-target";
import { CompanyExplorer } from "@/modules/targets/components/company-explorer";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { ToneBadge } from "@/components/shared/tone-badge";
import type { Tone } from "@/components/shared/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { companyCatalog, tierProfiles } from "@/core/content";
import { PRIORITY_LABEL, primaryTier } from "@/modules/targets/domain/companies";
import { diffDays } from "@/core/domain/dates";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";
import { MAX_TARGETS, getTargetsOverview } from "@/modules/targets/services/targets";

export const metadata: Metadata = { title: "Targets" };

const PRIORITY_TONE: Record<string, Tone> = { dream: "primary", target: "info", safe: "neutral" };

export default async function TargetsPage() {
  const [targets, settings] = await Promise.all([getTargetsOverview(), getSettings()]);
  const today = todayIn(settings);
  const focus = primaryTier(targets);

  return (
    <>
      <PageHeader
        icon={TargetIcon}
        title="Target companies"
        description="Pick the companies you are aiming at. Each gets a prep plan built for the kind of company it is: a DSA set at the right difficulty, the system design cases, and the subjects that round tests."
      />
      <div className="space-y-6">
        {targets.length === 0 ? (
          <EmptyState icon={TargetIcon} title="No targets yet" compact>
            <p>Browse the catalogue below and tap + on a company, or type your own.</p>
          </EmptyState>
        ) : (
          <>
            {focus && <p className="text-sm text-muted-foreground">Your prep leans toward <span className="font-medium text-foreground">{tierProfiles.find((t) => t.id === focus)?.name}</span> because of your highest-priority target. Their gaps rise to the top of your backlog.</p>}
            <ul className="grid gap-3 md:grid-cols-2">
              {targets.map((t) => {
                const days = t.interviewDate ? diffDays(t.interviewDate, today) : null;
                const weakest = t.areas.toSorted((a, b) => a.pct - b.pct).slice(0, 2);
                return (
                  <li key={t.id}>
                    <Link href={`/targets/${t.id}`} className="block rounded-xl border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold">{t.name}</h2>
                        <ToneBadge tone={PRIORITY_TONE[t.priority] ?? "neutral"}>{PRIORITY_LABEL[t.priority]}</ToneBadge>
                        <span className="text-xs text-muted-foreground">{t.tierName}</span>
                        {days !== null && (
                          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarClock className="size-3.5" aria-hidden /> {days >= 0 ? `${days} day${days === 1 ? "" : "s"} to go` : "date passed"}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={t.overall} aria-label={`${t.name} readiness`} className="h-2" />
                        <span className="tabular font-mono text-sm">{t.overall}%</span>
                      </div>
                      {weakest.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Furthest behind: {weakest.map((a) => `${a.label} ${a.pct}%`).join(", ")}</p>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <section aria-label="Find companies" className="space-y-3">
          <SectionHeading title="Find a company" hint="Search the catalogue by kind of company and region" />
          <CompanyExplorer tiers={tierProfiles} companies={companyCatalog} added={targets.map((t) => t.name)} disabled={targets.length >= MAX_TARGETS} />
          <details className="rounded-xl border bg-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Not listed? Add your own</summary>
            <div className="px-4 pb-4">
              <AddTarget tiers={tierProfiles} companies={companyCatalog} disabled={targets.length >= MAX_TARGETS} />
            </div>
          </details>
        </section>

        <section aria-label="Kinds of company" className="space-y-3">
          <SectionHeading title="What each kind of company tests" hint="Typical patterns, not inside knowledge of any one company" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tierProfiles.map((t) => (
              <Card key={t.id} size="sm">
                <CardHeader>
                  <CardTitle>{t.name}</CardTitle>
                  <CardDescription>{t.short}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{t.blurb}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.rounds.length} rounds · DSA set of {t.dsa.size} ({t.dsa.mix.Easy}% easy, {t.dsa.mix.Medium}% medium, {t.dsa.mix.Hard}% hard) · {t.designCases.length} design cases · {companyCatalog.filter((c) => c.tier === t.id).length} companies
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
