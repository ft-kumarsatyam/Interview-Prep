"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Search } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/badges";
import { Chip } from "@/components/shared/chip";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExternalProgress, ExternalQuestion, ExternalSheet } from "@/modules/dsa/domain/external-catalogue";
import { filterExternalQuestions, summarizeExternalProgress } from "@/modules/dsa/domain/external-catalogue";
import { companyNames } from "@/modules/dsa/domain/company-tags";
import { replaceQuery } from "@/components/shared/history-back-link";
import type { DsaViewState } from "@/modules/dsa/components/dsa-view-state";
import { ExternalQuestionTimer } from "@/modules/dsa/components/external-question-timer";
import { ExternalCompletionButton } from "@/modules/dsa/components/external-completion-button";
import { LadderTable, sheetProblemHref, StatusPill } from "@/modules/dsa/components/ladder-table";

const ALL_STAGES = "all";

export function ExternalSheetBrowser({
  sheets,
  statuses = {},
  initial,
}: {
  sheets: readonly ExternalSheet[];
  statuses?: Record<string, ExternalProgress>;
  initial?: Pick<DsaViewState, "sheet" | "section" | "sview" | "scompany" | "spattern">;
}) {
  const wantedSheet = initial?.sheet ?? "";
  const [sheetId, setSheetIdState] = useState(sheets.some((item) => item.id === wantedSheet) ? wantedSheet : (sheets[0]?.id ?? ""));
  const [view, setViewState] = useState<"topic" | "company">(initial?.sview ?? "topic");
  const [query, setQuery] = useState("");
  const [section, setSectionState] = useState(initial?.section ?? "");
  const [company, setCompanyState] = useState(initial?.scompany ?? "");
  const [pattern, setPatternState] = useState(initial?.spattern ?? "");
  const setSheetId = (id: string) => {
    setSheetIdState(id);
    setSectionState("");
    setCompanyState("");
    setPatternState("");
    replaceQuery({ sheet: id, section: null, scompany: null, spattern: null });
  };
  const setView = (next: "topic" | "company") => {
    setViewState(next);
    replaceQuery({ sview: next === "company" ? next : null });
  };
  const setSection = (value: string) => {
    setSectionState(value);
    setPatternState("");
    replaceQuery({ section: value, spattern: null });
  };
  const setCompany = (value: string) => {
    setCompanyState(value);
    replaceQuery({ scompany: value });
  };
  const setPattern = (value: string) => {
    setPatternState(value);
    replaceQuery({ spattern: value || null });
  };
  const sheet = sheets.find((item) => item.id === sheetId) ?? sheets[0];
  const isLadder = sheet?.kind === "ladder";
  const statusMap = useMemo(() => new Map(Object.entries(statuses)), [statuses]);
  const sections = useMemo(() => sheet?.sections ?? [], [sheet]);
  const activeSection = (isLadder && section === ALL_STAGES) || sections.includes(section) ? section : sections[0] ?? "";
  const companies = useMemo(() => companyNames(sheet?.questions ?? []), [sheet]);
  const activeCompany = companies.includes(company) ? company : companies[0] ?? "";
  const inSection = useMemo(
    () => (sheet?.questions ?? []).filter((question) => activeSection === ALL_STAGES || question.section === activeSection),
    [sheet, activeSection],
  );
  const patterns = useMemo(() => (isLadder ? [...new Set(inSection.map((question) => question.category))] : []), [isLadder, inSection]);
  const activePattern = patterns.includes(pattern) ? pattern : "";
  const questions = useMemo(() => {
    if (!sheet) return [];
    const byCompany = view === "company" && !isLadder;
    return filterExternalQuestions(byCompany ? sheet.questions : inSection, {
      query,
      difficulty: "all",
      category: activePattern,
      company: byCompany ? activeCompany : "",
      status: "all",
    }, statusMap);
  }, [sheet, isLadder, inSection, query, view, activeCompany, activePattern, statusMap]);
  const summary = sheet ? summarizeExternalProgress(sheet.questions, statusMap) : null;

  if (!sheet) return null;
  const companyView = view === "company" && !isLadder;

  return (
    <section className="space-y-3" aria-label={sheets.length > 1 ? "Ordered sheets" : sheet.title}>
      {sheets.length > 1 && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Ordered sheets</h2>
              <p className="text-sm text-muted-foreground">Every question opens inside PrepOS with its own statement and judge. Pick a stage or topic so the list stays short.</p>
            </div>
            <Link href="/dsa/sheets" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline">
              All sheets <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <Tabs value={sheet.id} onValueChange={setSheetId}>
            <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
              {sheets.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.title}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </>
      )}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2">
            {sheet.title}
            <span className="font-mono text-xs font-normal text-muted-foreground">{summary?.completed ?? 0}/{summary?.total ?? sheet.questions.length}</span>
          </CardTitle>
          <CardDescription>
            {sheet.description}{" "}
            <a href={sheet.sourceUrl} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">{sheet.source}</a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {!isLadder && (
              <>
                <Chip pressed={view === "topic"} onClick={() => setView("topic")}>By topic</Chip>
                <Chip pressed={view === "company"} onClick={() => setView("company")}>By company ({companies.length})</Chip>
              </>
            )}
            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isLadder ? "Search task, signal or skill" : "Search this view"} className="pl-9" aria-label="Search sheet questions" />
            </div>
            {query && <Button variant="ghost" size="sm" onClick={() => setQuery("")}>Clear</Button>}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={companyView ? "Companies" : isLadder ? "Stages" : "Topics"}>
            {isLadder && <Chip pressed={activeSection === ALL_STAGES} onClick={() => setSection(ALL_STAGES)} className="shrink-0" count={sheet.questions.length}>All stages</Chip>}
            {(companyView ? companies : sections).map((value) => (
              <Chip
                key={value}
                pressed={(companyView ? activeCompany : activeSection) === value}
                onClick={() => companyView ? setCompany(value) : setSection(value)}
                className="shrink-0"
                count={isLadder ? sheet.questions.filter((question) => question.section === value).length : undefined}
              >
                {value}
              </Chip>
            ))}
          </div>
          {patterns.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Patterns">
              <Chip pressed={activePattern === ""} onClick={() => setPattern("")} className="min-h-8 text-xs">All patterns</Chip>
              {patterns.map((value) => (
                <Chip key={value} pressed={activePattern === value} onClick={() => setPattern(value)} className="min-h-8 text-xs">{value}</Chip>
              ))}
            </div>
          )}
          {companyView && companies.length === 0 ? (
            <EmptyState compact title="No company tags on this sheet" icon={Search}>Questions are still listed by topic. Company tags are added only when a question matches a known interview problem.</EmptyState>
          ) : questions.length === 0 ? (
            <EmptyState compact title="Nothing in this view" icon={Search}>Try another stage, topic, company, or search.</EmptyState>
          ) : isLadder ? (
            <LadderTable questions={questions} statuses={statusMap} showStage={activeSection === ALL_STAGES} />
          ) : (
            <QuestionList questions={questions} statuses={statusMap} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function QuestionList({ questions, statuses }: { questions: readonly ExternalQuestion[]; statuses: ReadonlyMap<string, ExternalProgress> }) {
  return (
    <ul className="divide-y rounded-lg border">
      {questions.map((question) => {
        const links = question.links.filter((link) => link.scope === "item").slice(0, 2);
        const href = sheetProblemHref(question);
        const status = statuses.get(question.id) ?? "not-started";
        return (
          <li key={question.id} className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{question.order}</span>
                {href ? <Link href={href} className="font-medium hover:text-primary hover:underline">{question.title}</Link> : <span className="font-medium">{question.title}</span>}
                <DifficultyBadge difficulty={question.difficulty} />
                {status !== "not-started" && <StatusPill status={status} />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{question.section}{question.category ? ` · ${question.category}` : ""}</p>
              {question.companies.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{question.companies.map((tag) => tag.company).join(", ")}</p>}
              {links.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {links.map((link) => (
                    <a key={`${question.id}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      {link.label}<ExternalLink className="size-3" aria-hidden />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {href ? (
                <Button size="sm" asChild>
                  <Link href={href}>Open in PrepOS<ArrowRight className="size-3.5" aria-hidden /></Link>
                </Button>
              ) : (
                <ExternalQuestionTimer itemId={question.id} />
              )}
              {status !== "completed" && <ExternalCompletionButton itemId={question.id} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
