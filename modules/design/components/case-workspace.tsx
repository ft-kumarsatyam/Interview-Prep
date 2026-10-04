"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, ListTree, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/core/utils";

export interface TocItem {
  id: string;
  label: string;
}

export type CaseTab = "study" | "practice";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useActiveSection(ids: readonly string[], enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    if (!enabled) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: "-72px 0px -55% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids, enabled]);
  return active;
}

function TocLinks({ toc, active, onPick }: { toc: readonly TocItem[]; active: string | null; onPick?: () => void }) {
  return (
    <ol className="space-y-0.5 border-l text-sm">
      {toc.map((t) => (
        <li key={t.id}>
          <a
            href={`#${t.id}`}
            onClick={onPick}
            aria-current={active === t.id ? "location" : undefined}
            className={cn(
              "-ml-px flex min-h-9 items-center border-l-2 py-1 pl-3 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:min-h-0",
              active === t.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Study / practice tabs for a case page. The tab lives in `?tab=` so a reload or shared link
 * keeps you on the mock; it's written with history.replaceState to avoid a server round trip.
 */
export function CaseWorkspace({
  initialTab,
  toc,
  study,
  practice,
  practiceLabel,
  readyHint,
}: {
  initialTab: CaseTab;
  toc: readonly TocItem[];
  study: React.ReactNode;
  practice: React.ReactNode;
  practiceLabel: string;
  readyHint: string;
}) {
  const [tab, setTab] = useState<CaseTab>(initialTab);
  const top = useRef<HTMLDivElement>(null);
  const mobileToc = useRef<HTMLDetailsElement>(null);
  const idKey = toc.map((t) => t.id).join("|");
  const ids = useMemo(() => idKey.split("|"), [idKey]);
  const active = useActiveSection(ids, tab === "study");

  function change(next: string) {
    const value: CaseTab = next === "practice" ? "practice" : "study";
    setTab(value);
    const url = new URL(window.location.href);
    if (value === "practice") url.searchParams.set("tab", "practice");
    else url.searchParams.delete("tab");
    url.hash = "";
    window.history.replaceState(null, "", url);
  }

  function startMock() {
    change("practice");
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }));
  }

  return (
    <div ref={top} className="scroll-mt-20">
      <Tabs value={tab} onValueChange={change}>
        <TabsList className="mb-6 h-10! w-full sm:w-fit">
          <TabsTrigger value="study" className="px-4">
            <BookOpen /> Study
          </TabsTrigger>
          <TabsTrigger value="practice" className="px-4">
            <Timer /> {practiceLabel}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="study" forceMount className="data-[state=inactive]:hidden">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="min-w-0 space-y-10">
              <details ref={mobileToc} className="group rounded-xl border bg-card lg:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                  <ListTree className="size-4 text-muted-foreground" aria-hidden />
                  On this page
                  <span className="text-xs font-normal text-muted-foreground">{toc.length} sections</span>
                  <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="px-4 pb-3">
                  <TocLinks
                    toc={toc}
                    active={active}
                    onPick={() => {
                      if (mobileToc.current) mobileToc.current.open = false;
                    }}
                  />
                </div>
              </details>

              {study}

              <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <p className="font-medium">Ready to try it yourself?</p>
                  <p className="text-sm text-muted-foreground">{readyHint}</p>
                </div>
                <Button onClick={startMock} className="h-10 shrink-0 px-4">
                  Start the {practiceLabel.toLowerCase()} <ArrowRight />
                </Button>
              </div>
            </div>

            <aside className="hidden lg:block" aria-label="On this page">
              <div className="sticky top-20 space-y-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">On this page</p>
                <TocLinks toc={toc} active={active} />
                <Button variant="outline" size="sm" onClick={startMock} className="w-full">
                  <Timer /> {practiceLabel}
                </Button>
              </div>
            </aside>
          </div>
        </TabsContent>

        {/* Force-mounted so a running mock timer and unsaved drafts survive a peek at the study tab. */}
        <TabsContent value="practice" forceMount className="data-[state=inactive]:hidden">
          {practice}
        </TabsContent>
      </Tabs>
    </div>
  );
}
