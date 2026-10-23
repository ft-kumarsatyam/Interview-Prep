import type { Metadata } from "next";
import Link from "next/link";
import { Code2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { problemBySlug } from "@/core/content";

import { genaiPrepDsa } from "@/core/genai-prep-pack";

export const metadata: Metadata = { title: "GenAI sprint · DSA" };

export default function GenaiSprintDsaPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={Code2}
        title="DSA patterns"
        description={`${genaiPrepDsa.planned_problem_count} problems in the sprint schedule; ${genaiPrepDsa.problem_count_in_catalog} in the pattern catalog.`}
      />
      {genaiPrepDsa.habits.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold">Interview habits</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {genaiPrepDsa.habits.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </section>
      )}
      {genaiPrepDsa.patterns.map((pat) => (
        <section key={pat.pattern} className="space-y-2">
          <h2 className="text-base font-semibold">{pat.pattern}</h2>
          <p className="text-sm text-muted-foreground">{pat.goal}</p>
          <p className="text-sm">
            <span className="font-medium">Say aloud:</span> {pat.say_aloud}
          </p>
          <ul className="space-y-1 text-sm">
            {pat.problems.map((p) => {
              const inApp = problemBySlug.has(p.slug);
              return (
                <li key={p.slug}>
                  {inApp ? (
                    <Link href={`/dsa/${p.slug}`} className="text-primary hover:underline">
                      {p.title}
                    </Link>
                  ) : (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                      {p.title}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <section>
        <h2 className="text-sm font-semibold">AI-flavoured implementations</h2>
        <ul className="mt-2 space-y-3 text-sm">
          {genaiPrepDsa.ai_implementations.map((i) => (
            <li key={i.id} className="rounded-md border px-3 py-2">
              <p className="font-medium">{i.name}</p>
              <p className="text-muted-foreground">{i.spec}</p>
              <p className="mt-1 text-xs">
                <span className="font-medium">Done when:</span> {i.done_when}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
