import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { problems, type ContentProblem } from "@/lib/content";

export const metadata: Metadata = { title: "DSA" };

const TRACKS = [
  { id: "main", label: "DSA (in JS)", blurb: "Core pass first (151 must-know), then the extended set — pattern by pattern." },
  { id: "js", label: "JavaScript", blurb: "LeetCode 30 Days of JavaScript: closures, promises, debounce, event emitter." },
  { id: "sql", label: "SQL", blurb: "Classic backend SQL questions. One a day from week 4." },
] as const;

function groupByPattern(list: ContentProblem[]): Array<[string, ContentProblem[]]> {
  const groups = new Map<string, ContentProblem[]>();
  for (const p of list) groups.set(p.pattern, [...(groups.get(p.pattern) ?? []), p]);
  return [...groups];
}

export default function DsaPage() {
  return (
    <>
      <PageHeader title="DSA" description={`${problems.length} free LeetCode problems, solved in JavaScript. Progress tracking arrives in Phase 4.`} />
      <Tabs defaultValue="main">
        <TabsList>
          {TRACKS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label} · {problems.filter((p) => p.track === t.id).length}
            </TabsTrigger>
          ))}
        </TabsList>
        {TRACKS.map((t) => {
          const list = problems.filter((p) => p.track === t.id);
          const passes = t.id === "main" ? (["core", "extended"] as const) : ([null] as const);
          return (
            <TabsContent key={t.id} value={t.id} className="mt-4 space-y-6">
              <p className="text-sm text-muted-foreground">{t.blurb}</p>
              {passes.map((tier) => {
                const subset = tier ? list.filter((p) => p.tier === tier) : list;
                return (
                  <section key={tier ?? "all"}>
                    {tier && (
                      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {tier === "core" ? "Pass 1 · Core" : "Pass 2 · Extended"} ({subset.length})
                      </h2>
                    )}
                    <Accordion type="multiple" className="rounded-xl border bg-card">
                      {groupByPattern(subset).map(([pattern, items]) => (
                        <AccordionItem key={pattern} value={pattern} className="px-4">
                          <AccordionTrigger>
                            <span className="flex flex-1 items-center justify-between pr-2">
                              {pattern}
                              <span className="font-mono text-xs text-muted-foreground">{items.length}</span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="divide-y">
                              {items.map((p) => (
                                <li key={p.slug} className="flex items-center gap-3 py-2 text-sm">
                                  <span className="w-10 font-mono text-xs text-muted-foreground">#{p.order}</span>
                                  <a href={p.url} target="_blank" rel="noreferrer" className="flex-1 hover:text-primary hover:underline">
                                    {p.title}
                                    <ExternalLink className="ml-1 inline size-3" />
                                  </a>
                                  <DifficultyBadge difficulty={p.difficulty} />
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
}
