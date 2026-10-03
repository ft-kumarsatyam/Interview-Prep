"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Code2, type LucideIcon } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SPLIT_QUERY, useMediaQuery } from "./use-client-prefs";

export interface IdePane {
  id: string;
  label: string;
  icon: LucideIcon;
  content: React.ReactNode;
}

interface IdeContextValue {
  /** Side by side (tablet and up) rather than one pane at a time. */
  split: boolean;
  full: boolean;
  toggleFull: () => void;
}

const IdeContext = createContext<IdeContextValue>({ split: false, full: false, toggleFull: () => {} });
export const useIde = () => useContext(IdeContext);

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || !!t.closest(".cm-editor"));

/**
 * LeetCode-style layout. Tablet and up: the problem on the left and the code workspace on the right,
 * with a draggable divider whose position is remembered. Phones: one pane at a time behind tabs, all
 * kept mounted so switching never loses code. `F` (outside the editor) toggles focus mode, which
 * fills the whole window; Esc leaves it.
 */
export function IdeShell({
  storageId,
  panes,
  workspace,
  className,
}: {
  storageId: string;
  panes: IdePane[];
  workspace: React.ReactNode;
  className?: string;
}) {
  const split = useMediaQuery(SPLIT_QUERY);
  const [full, setFull] = useState(false);
  const [leftTab, setLeftTab] = useState(panes[0]?.id ?? "");
  const [mobileTab, setMobileTab] = useState(panes[0]?.id ?? "code");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && full) setFull(false);
      else if ((e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        setFull((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  const ctx: IdeContextValue = { split, full, toggleFull: () => setFull((f) => !f) };
  const frame = cn(
    full ? "fixed inset-0 z-50 h-dvh bg-background p-2 pt-[max(0.5rem,env(safe-area-inset-top))]" : "md:h-[calc(100dvh-13rem-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-8.75rem)] md:min-h-[480px]",
    className,
  );

  if (!split) {
    return (
      <IdeContext.Provider value={ctx}>
        <div data-ide className={cn(full && frame, full && "overflow-y-auto")}>
          <Tabs value={mobileTab} onValueChange={setMobileTab} className="gap-3">
            <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur">
              <TabsList className="w-full group-data-horizontal/tabs:h-10">
                {panes.map((p) => (
                  <TabsTrigger key={p.id} value={p.id} className="px-2">
                    <p.icon className="hidden min-[400px]:block" />
                    {p.label}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="code" className="px-2">
                  <Code2 className="hidden min-[400px]:block" />
                  Code
                </TabsTrigger>
              </TabsList>
            </div>
            {panes.map((p) => (
              <TabsContent key={p.id} value={p.id} forceMount className="data-[state=inactive]:hidden">
                {p.content}
              </TabsContent>
            ))}
            <TabsContent value="code" forceMount className="data-[state=inactive]:hidden">
              {workspace}
            </TabsContent>
          </Tabs>
        </div>
      </IdeContext.Provider>
    );
  }

  return (
    <IdeContext.Provider value={ctx}>
      <div data-ide className={frame}>
        <ResizablePanelGroup storageId={`ide:${storageId}`} orientation="horizontal">
          <ResizablePanel id="problem" defaultSize="42" minSize="22" className="flex flex-col overflow-hidden rounded-xl border bg-card">
            <Tabs value={leftTab} onValueChange={setLeftTab} className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="flex shrink-0 items-center border-b bg-muted/30 px-2 py-1.5">
                <TabsList className="h-8 bg-transparent p-0">
                  {panes.map((p) => (
                    <TabsTrigger key={p.id} value={p.id} className="h-7 px-2.5 text-xs data-[state=active]:bg-background">
                      <p.icon className="size-3.5" />
                      {p.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {panes.map((p) => (
                <TabsContent
                  key={p.id}
                  value={p.id}
                  forceMount
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 data-[state=inactive]:hidden"
                >
                  {p.content}
                </TabsContent>
              ))}
            </Tabs>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel id="workspace" defaultSize="58" minSize="35" className="flex flex-col">
            {workspace}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </IdeContext.Provider>
  );
}
