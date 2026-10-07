"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/badges";
import { Chip } from "@/components/shared/chip";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExternalProgress, ExternalSheet } from "@/modules/dsa/domain/external-catalogue";
import { filterExternalQuestions, summarizeExternalProgress } from "@/modules/dsa/domain/external-catalogue";
import { ExternalQuestionTimer } from "@/modules/dsa/components/external-question-timer";
import { ExternalCompletionButton } from "@/modules/dsa/components/external-completion-button";

export function ExternalSheetBrowser({ sheets, statuses = {} }: { sheets: readonly ExternalSheet[]; statuses?: Record<string, ExternalProgress> }) {
  const [sheetId, setSheetId] = useState(sheets[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<"all" | "Easy" | "Medium" | "Hard">("all");
  const [category, setCategory] = useState("");
  const [company, setCompany] = useState("");
  const sheet = sheets.find((item) => item.id === sheetId) ?? sheets[0];
  const statusMap = useMemo(() => new Map(Object.entries(statuses)), [statuses]);
  const categories = useMemo(() => [...new Set((sheet?.questions ?? []).map((question) => question.category))].toSorted(), [sheet]);
  const companies = useMemo(() => [...new Set((sheet?.questions ?? []).flatMap((question) => question.companies.map((tag) => tag.company)))].toSorted(), [sheet]);
  const questions = useMemo(
    () => (sheet ? filterExternalQuestions(sheet.questions, { query, difficulty, category, company, status: "all" }, statusMap) : []),
    [sheet, query, difficulty, category, company, statusMap],
  );
  const summary = sheet ? summarizeExternalProgress(sheet.questions, statusMap) : null;

  if (!sheet) return null;

  return (
    <section className="space-y-3" aria-labelledby="external-dsa-title">
      <div>
        <h2 id="external-dsa-title" className="text-lg font-semibold">External ordered sheets</h2>
        <p className="text-sm text-muted-foreground">Follow the learning order, then open the matching local problem when one exists.</p>
      </div>
      <Tabs value={sheet.id} onValueChange={setSheetId}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          {sheets.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.title}</TabsTrigger>)}
        </TabsList>
        {sheets.map((item) => (
          <TabsContent key={item.id} value={item.id} className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {item.title}
                  <span className="font-mono text-xs font-normal text-muted-foreground">{summary?.completed ?? 0}/{summary?.total ?? item.questions.length}</span>
                </CardTitle>
                <CardDescription>
                  {item.description}{" "}
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">{item.source}</a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="relative min-w-52 flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, pattern or section" className="pl-9" aria-label="Search external questions" />
                  </div>
                  {(["all", "Easy", "Medium", "Hard"] as const).map((value) => (
                    <Chip key={value} pressed={difficulty === value} onClick={() => setDifficulty(value)}>{value === "all" ? "All levels" : value}</Chip>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 max-w-64 rounded-md border bg-background px-2 text-sm" aria-label="Filter by pattern">
                    <option value="">All patterns</option>
                    {categories.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <select value={company} onChange={(event) => setCompany(event.target.value)} className="h-9 max-w-52 rounded-md border bg-background px-2 text-sm" aria-label="Filter by company">
                    <option value="">All companies</option>
                    {companies.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  {(query || category || company || difficulty !== "all") && <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setCategory(""); setCompany(""); setDifficulty("all"); }}>Clear filters</Button>}
                </div>
                {questions.length === 0 ? (
                  <EmptyState compact title="No questions match" icon={Search}>Try a different title, level, pattern, or company.</EmptyState>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <caption className="sr-only">{item.title} questions</caption>
                      <thead className="bg-muted/60 text-xs text-muted-foreground">
                        <tr><th className="p-3">#</th><th className="p-3">Question</th><th className="p-3">Pattern</th><th className="p-3">Level</th><th className="p-3">Companies</th><th className="p-3">Links</th><th className="p-3">Practice</th></tr>
                      </thead>
                      <tbody className="divide-y">
                        {questions.map((question) => (
                          <tr key={question.id} className="align-top hover:bg-muted/30">
                            <td className="p-3 font-mono text-xs text-muted-foreground">{question.order}</td>
                            <td className="p-3">
                              <div className="font-medium">{question.title}</div>
                              <div className="text-xs text-muted-foreground">{question.section}</div>
                              {question.localSlug && <Link href={`/dsa/${question.localSlug}`} className="mt-1 inline-block text-xs text-primary underline-offset-2 hover:underline">Open local PrepOS problem</Link>}
                            </td>
                            <td className="p-3 text-muted-foreground">{question.category}</td>
                            <td className="p-3"><DifficultyBadge difficulty={question.difficulty} /></td>
                            <td className="max-w-52 p-3 text-xs text-muted-foreground">{question.companies.map((tag) => tag.company).join(", ") || "—"}</td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1.5">{question.links.map((link) => <a key={`${question.id}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">{link.label}{link.scope === "hub" && <span className="text-muted-foreground">(hub)</span>}<ExternalLink className="size-3" aria-hidden /></a>)}</div>
                              <div className="mt-2 text-2xs text-muted-foreground">Source coverage: {question.sourceCoverage}</div>
                            </td>
                            <td className="p-3"><div className="flex flex-wrap gap-1.5"><ExternalQuestionTimer itemId={question.id} /><ExternalCompletionButton itemId={question.id} /><ExternalCompletionButton itemId={question.id} gfg /></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
