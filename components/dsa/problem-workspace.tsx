"use client";

import { useState, useSyncExternalStore } from "react";
import { Code2, FileText, History, NotebookPen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Pane = "statement" | "code" | "notes" | "history";

const WIDE = "(min-width: 1024px)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Phones: one pane at a time behind sticky tabs. Desktop: the statement is pinned on the left and the tabs drive
 * the right column. Every pane stays mounted, so switching tabs never throws away code or a half-written note.
 */
export function ProblemWorkspace({
  statement,
  code,
  notes,
  history,
  solveCount,
}: {
  statement: React.ReactNode;
  code?: React.ReactNode;
  notes: React.ReactNode;
  history: React.ReactNode;
  solveCount: number;
}) {
  const [pane, setPane] = useState<Pane>("statement");
  const fallback: Pane = code ? "code" : "notes";
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
  const active: Pane = wide && pane === "statement" ? fallback : pane;
  const paneClass = "data-[state=inactive]:hidden lg:col-start-2 lg:row-start-2";

  return (
    <Tabs
      value={active}
      onValueChange={(v) => setPane(v as Pane)}
      data-pane={active}
      className="group/ws gap-3 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-x-6 lg:gap-y-3"
    >
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur lg:static lg:col-start-2 lg:row-start-1 lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <TabsList className="w-full group-data-horizontal/tabs:h-10">
          <PaneTrigger value="statement" icon={FileText} label="Problem" className="lg:hidden" />
          {code && <PaneTrigger value="code" icon={Code2} label="Code" />}
          <PaneTrigger value="notes" icon={NotebookPen} label="Notes" />
          <PaneTrigger value="history" icon={History} label={solveCount > 0 ? `History (${solveCount})` : "History"} />
        </TabsList>
      </div>

      <TabsContent
        value="statement"
        forceMount
        className="data-[state=inactive]:hidden lg:sticky lg:top-[calc(4.5rem+env(safe-area-inset-top))] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:block! lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-xl"
      >
        {statement}
      </TabsContent>
      {code && (
        <TabsContent value="code" forceMount className={cn(paneClass, fallback === "code" && "lg:group-data-[pane=statement]/ws:block!")}>
          {code}
        </TabsContent>
      )}
      <TabsContent value="notes" forceMount className={cn(paneClass, fallback === "notes" && "lg:group-data-[pane=statement]/ws:block!")}>
        {notes}
      </TabsContent>
      <TabsContent value="history" forceMount className={paneClass}>
        {history}
      </TabsContent>
    </Tabs>
  );
}

function PaneTrigger({ value, icon: Icon, label, className }: { value: Pane; icon: React.ComponentType<{ className?: string }>; label: string; className?: string }) {
  return (
    <TabsTrigger value={value} className={cn("px-2", className)}>
      <Icon className="hidden min-[400px]:block" />
      {label}
    </TabsTrigger>
  );
}
