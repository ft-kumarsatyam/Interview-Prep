import { ChevronDown, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToneBadge } from "@/components/shared/tone-badge";
import type { CheatSheet } from "@/modules/dsa/domain/dsa-cheat-sheet";

export function DsaCheatSheet({ sheets }: { sheets: readonly CheatSheet[] }) {
  return (
    <section aria-labelledby="dsa-cheat-sheets-title" className="space-y-3">
      <div>
        <h2 id="dsa-cheat-sheets-title" className="text-lg font-semibold">Pattern cheat sheets</h2>
        <p className="text-sm text-muted-foreground">Recognize the signal before you choose a data structure or technique.</p>
      </div>
      <div className="grid gap-4">
        {sheets.map((sheet) => (
          <Card key={sheet.id}>
            <details open className="group">
              <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {sheet.title}
                      <ToneBadge tone="success">{sheet.level}</ToneBadge>
                    </CardTitle>
                    <CardDescription>{sheet.description}</CardDescription>
                  </div>
                  <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </CardHeader>
              </summary>
              <CardContent className="space-y-5">
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                    <caption className="sr-only">{sheet.title} pattern recognition guide</caption>
                    <thead className="bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="w-[15%] p-3 font-medium">Pattern</th>
                        <th scope="col" className="w-[25%] p-3 font-medium">Recognition signal</th>
                        <th scope="col" className="w-[19%] p-3 font-medium">Typical problems</th>
                        <th scope="col" className="w-[13%] p-3 font-medium">Complexity</th>
                        <th scope="col" className="w-[28%] p-3 font-medium">First question to ask</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sheet.patterns.map((pattern) => (
                        <tr key={pattern.pattern} className="align-top transition-colors hover:bg-muted/30">
                          <th scope="row" className="p-3 font-semibold">{pattern.pattern}</th>
                          <td className="p-3 text-muted-foreground">{pattern.recognitionSignal}</td>
                          <td className="p-3">{pattern.typicalProblems}</td>
                          <td className="p-3 font-mono text-xs text-primary">{pattern.typicalComplexity}</td>
                          <td className="p-3 text-muted-foreground">{pattern.firstQuestion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-lg border bg-primary/5 p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Lightbulb className="size-4" aria-hidden /> Fast pattern decision tree
                    </h3>
                    <dl className="mt-3 divide-y divide-primary/10 text-sm">
                      {sheet.decisionTree.map((item) => (
                        <div key={item.signal} className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:gap-4">
                          <dt className="text-muted-foreground">{item.signal}</dt>
                          <dd className="font-medium text-primary sm:text-right">{item.thinkFirst}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-sm">
                    <h3 className="font-semibold">How to use this</h3>
                    <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground">
                      <li>Underline the signal in the problem statement.</li>
                      <li>Choose the simplest matching pattern.</li>
                      <li>State the target complexity before coding.</li>
                      <li>Only then open the problem and solve it.</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </details>
          </Card>
        ))}
      </div>
    </section>
  );
}
