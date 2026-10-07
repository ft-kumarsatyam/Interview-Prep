"use client";

import { useMemo, useState } from "react";
import { ExternalLink, LibraryBig } from "lucide-react";
import { Chip } from "@/components/shared/chip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExternalResource } from "@/modules/dsa/domain/external-catalogue";

export function ExternalResources({ resources }: { resources: readonly ExternalResource[] }) {
  const subjects = useMemo(() => [...new Set(resources.map((resource) => resource.subject))].toSorted(), [resources]);
  const [subject, setSubject] = useState("All");
  const visible = resources.filter((resource) => subject === "All" || resource.subject === subject);
  return (
    <section className="space-y-3" aria-labelledby="external-resources-title">
      <div>
        <h2 id="external-resources-title" className="text-lg font-semibold">Core interview resources</h2>
        <p className="text-sm text-muted-foreground">Optional external references for System Design, OS, DBMS, OOP, networking, and backend fundamentals.</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><LibraryBig className="size-4 text-primary" aria-hidden />Resource directory</CardTitle>
          <CardDescription>Links open on the original source. PrepOS does not copy or crawl external content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Chip pressed={subject === "All"} onClick={() => setSubject("All")}>All subjects</Chip>
            {subjects.map((item) => <Chip key={item} pressed={subject === item} onClick={() => setSubject(item)}>{item}</Chip>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((resource) => (
              <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="rounded-lg border p-4 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{resource.title}</div>
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </div>
                <div className="mt-1 text-xs text-primary">{resource.subject} · {resource.topic}</div>
                <p className="mt-2 text-xs text-muted-foreground">{resource.description}</p>
                <p className="mt-3 text-2xs text-muted-foreground">{resource.source}</p>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
