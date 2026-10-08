"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbulb, ListChecks, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/shared/chip";
import { SectionHeading } from "@/components/shared/section-heading";
import { replaceQuery } from "@/components/shared/history-back-link";
import type { CheatSheet } from "@/modules/dsa/domain/dsa-cheat-sheet";

const TH = "px-3 py-2 text-left text-xs font-medium text-muted-foreground";
const TD = "px-3 py-2.5 align-top";

function ProblemLinks({ slugs, titles }: { slugs: readonly string[]; titles: Readonly<Record<string, string>> }) {
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-1">
      {slugs.map((slug) => (
        <Link key={slug} href={`/dsa/${slug}`} className="text-primary underline-offset-2 hover:underline">
          {titles[slug] ?? slug}
        </Link>
      ))}
    </span>
  );
}

export function DsaCheatSheet({
  sheets,
  initialId = "",
  problemTitles = {},
}: {
  sheets: readonly CheatSheet[];
  initialId?: string;
  /** Titles for the problem slugs the sheets link to. */
  problemTitles?: Readonly<Record<string, string>>;
}) {
  const [sheetId, setSheetId] = useState(() => (sheets.some((sheet) => sheet.id === initialId) ? initialId : (sheets.find((sheet) => sheet.id === "arrays")?.id ?? sheets[0]?.id ?? "")));
  const pick = (id: string) => {
    setSheetId(id);
    replaceQuery({ cheat: id });
  };
  const sheet = sheets.find((item) => item.id === sheetId) ?? sheets[0];
  if (!sheet) return null;

  return (
    <section aria-labelledby="dsa-cheat-sheets-title" className="space-y-3">
      <div>
        <h2 id="dsa-cheat-sheets-title" className="text-lg font-semibold">Pattern cheat sheets</h2>
        <p className="text-sm text-muted-foreground">One topic at a time: the patterns, the interview routine, and a fast decision tree.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Cheat sheet topics">
        {sheets.map((item) => (
          <Chip key={item.id} pressed={item.id === sheet.id} onClick={() => pick(item.id)} className="shrink-0">
            {item.title}
          </Chip>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{sheet.title}</CardTitle>
          <CardDescription>{sheet.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <SectionHeading level={3} title="Patterns" hint={`${sheet.patterns.length} patterns`} />
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className={TH}>Pattern</th>
                    <th scope="col" className={TH}>When to use</th>
                    <th scope="col" className={TH}>Typical problems</th>
                    <th scope="col" className={TH}>Complexity</th>
                    <th scope="col" className={TH}>First question to ask</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sheet.patterns.map((pattern) => (
                    <tr key={pattern.pattern}>
                      <th scope="row" className={`${TD} text-left font-semibold`}>{pattern.pattern}</th>
                      <td className={`${TD} text-muted-foreground`}>{pattern.recognitionSignal}</td>
                      <td className={TD}>
                        <span>{pattern.typicalProblems}</span>
                        {pattern.examples?.length ? <span className="mt-1 block text-xs"><ProblemLinks slugs={pattern.examples} titles={problemTitles} /></span> : null}
                      </td>
                      <td className={`${TD} font-mono text-xs whitespace-nowrap text-primary`}>{pattern.typicalComplexity}</td>
                      <td className={`${TD} text-muted-foreground`}>{pattern.firstQuestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="grid gap-3 md:hidden">
              {sheet.patterns.map((pattern) => (
                <li key={pattern.pattern} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold">{pattern.pattern}</h4>
                    <span className="shrink-0 font-mono text-xs text-primary">{pattern.typicalComplexity}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{pattern.recognitionSignal}</p>
                  <p className="mt-2 text-xs"><span className="font-medium">Try: </span>{pattern.typicalProblems}</p>
                  {pattern.examples?.length ? <p className="mt-1 text-xs"><ProblemLinks slugs={pattern.examples} titles={problemTitles} /></p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{pattern.firstQuestion}</p>
                </li>
              ))}
            </ul>
          </div>

          {sheet.workflow?.length ? (
            <div>
              <SectionHeading level={3} title={<span className="flex items-center gap-2"><ListChecks className="size-4 text-primary" aria-hidden /> Interview workflow</span>} />
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th scope="col" className={TH}>Step</th>
                      <th scope="col" className={TH}>What to do</th>
                      <th scope="col" className={TH}>Common mistake</th>
                      <th scope="col" className={TH}>Practice on</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sheet.workflow.map((step) => (
                      <tr key={step.step}>
                        <th scope="row" className={`${TD} text-left font-mono text-xs whitespace-nowrap text-primary`}>Step {step.step}</th>
                        <td className={`${TD} font-medium`}>{step.action}</td>
                        <td className={`${TD} text-muted-foreground`}>{step.mistake}</td>
                        <td className={`${TD} text-xs`}><ProblemLinks slugs={step.practice} titles={problemTitles} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ol className="grid gap-3 md:hidden">
                {sheet.workflow.map((step) => (
                  <li key={step.step} className="rounded-lg border p-3">
                    <p className="font-mono text-xs text-primary">Step {step.step}</p>
                    <p className="mt-1 text-sm font-medium">{step.action}</p>
                    <p className="mt-1 flex gap-1.5 text-xs text-muted-foreground"><TriangleAlert className="mt-0.5 size-3 shrink-0 text-warning" aria-hidden /> {step.mistake}</p>
                    <p className="mt-2 text-xs"><ProblemLinks slugs={step.practice} titles={problemTitles} /></p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="rounded-lg border bg-primary/5 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Lightbulb className="size-4" aria-hidden /> Fast pattern decision tree
            </h3>
            <table className="mt-3 w-full text-sm">
              <thead className="sr-only md:not-sr-only">
                <tr>
                  <th scope="col" className={TH}>Question signal</th>
                  <th scope="col" className={TH}>Think first</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sheet.decisionTree.map((item) => (
                  <tr key={item.signal} className="flex flex-col md:table-row">
                    <td className={`${TD} text-muted-foreground`}>{item.signal}</td>
                    <td className={`${TD} pt-0 font-medium md:pt-2.5`}>{item.thinkFirst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
