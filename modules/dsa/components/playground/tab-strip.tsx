"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_NAME, MAX_TABS, isDirty, nameProblem, type Tab } from "@/modules/dsa/domain/playground-tabs";
import { cn } from "@/core/utils";

export const EDITOR_PANEL_ID = "playground-editor-panel";

/** The open files above the editor. Double-click or F2 renames, Alt+Shift+Arrow reorders, and tabs can be dragged. */
export function TabStrip({
  tabs,
  activeId,
  onFocus,
  onClose,
  onRename,
  onMove,
  onNew,
}: {
  tabs: Tab[];
  activeId: string;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onMove: (id: string, to: number) => void;
  onNew: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const activeRef = refs.current.get(activeId);

  useEffect(() => {
    refs.current.get(activeId)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId, activeRef]);

  const problem = editing ? nameProblem(draft, editing, tabs) : null;

  function startRename(t: Tab) {
    setDraft(t.name);
    setEditing(t.id);
  }

  function commit() {
    if (!editing) return;
    if (!nameProblem(draft, editing, tabs)) onRename(editing, draft.trim());
    setEditing(null);
  }

  function onKey(e: React.KeyboardEvent, t: Tab, i: number) {
    if (e.key === "F2") {
      e.preventDefault();
      startRename(t);
    } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && e.altKey && e.shiftKey) {
      e.preventDefault();
      const to = i + (e.key === "ArrowRight" ? 1 : -1);
      onMove(t.id, to);
      requestAnimationFrame(() => refs.current.get(t.id)?.focus());
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      if (next) {
        onFocus(next.id);
        refs.current.get(next.id)?.focus();
      }
    }
  }

  return (
    <div className="flex shrink-0 items-stretch border-b bg-muted/20">
      <div role="tablist" aria-label="Open files" className="flex min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t, i) => {
          const active = t.id === activeId;
          const dirty = isDirty(t) && t.code.trim() !== "";
          return (
            <div
              key={t.id}
              role="presentation"
              draggable={editing !== t.id}
              onDragStart={(e) => {
                setDragId(t.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => dragId && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && dragId !== t.id) onMove(dragId, i);
                setDragId(null);
              }}
              onDragEnd={() => setDragId(null)}
              className={cn(
                "group relative flex h-9 shrink-0 items-center border-r text-xs",
                active ? "bg-background text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                dragId === t.id && "opacity-50",
              )}
            >
              {active && <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden />}
              {editing === t.id ? (
                <div className="px-1.5">
                  <input
                    autoFocus
                    value={draft}
                    maxLength={MAX_NAME}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commit();
                      else if (e.key === "Escape") setEditing(null);
                    }}
                    aria-label="File name"
                    aria-invalid={problem ? true : undefined}
                    title={problem ?? undefined}
                    className={cn(
                      "h-7 w-32 rounded border bg-background px-1.5 font-mono text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      problem && "border-destructive",
                    )}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  role="tab"
                  id={`playground-tab-${t.id}`}
                  aria-selected={active}
                  aria-controls={EDITOR_PANEL_ID}
                  tabIndex={active ? 0 : -1}
                  ref={(el) => {
                    if (el) refs.current.set(t.id, el);
                    else refs.current.delete(t.id);
                  }}
                  onClick={() => onFocus(t.id)}
                  onDoubleClick={() => startRename(t)}
                  onKeyDown={(e) => onKey(e, t, i)}
                  title={`${t.name}${t.snippet ? ` (snippet: ${t.snippet.title})` : ""}. Double-click or F2 to rename.`}
                  className="flex h-full max-w-44 min-w-0 items-center gap-1.5 pr-1 pl-3 font-mono focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                >
                  <span className="truncate">{t.name}</span>
                  {dirty && (
                    <>
                      <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
                      <span className="sr-only">unsaved changes</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => onClose(t.id)}
                aria-label={`Close ${t.name}`}
                tabIndex={active ? 0 : -1}
                className="mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-3" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 rounded-none"
        onClick={onNew}
        disabled={tabs.length >= MAX_TABS}
        aria-label="New tab"
        title={tabs.length >= MAX_TABS ? `Up to ${MAX_TABS} tabs` : "New tab"}
      >
        <Plus />
      </Button>
    </div>
  );
}
