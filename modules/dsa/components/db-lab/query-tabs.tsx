"use client";

import { useRef, useState } from "react";
import { Plus, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils";
import { MAX_TABS, MAX_TAB_NAME, type QueryTab } from "@/modules/dsa/domain/db-lab-tabs";

/**
 * Named query tabs (up to six) plus, while a challenge is open, a challenge tab that keeps its own draft.
 * Double-click or F2 renames a tab; Alt+1..6 switches (handled by the lab).
 */
export function QueryTabs({
  tabs,
  activeId,
  challengeTitle,
  onSelect,
  onSelectChallenge,
  onAdd,
  onClose,
  onRename,
}: {
  tabs: QueryTab[];
  /** Null while the challenge tab is the one showing. */
  activeId: string | null;
  challengeTitle: string | null;
  onSelect: (id: string) => void;
  onSelectChallenge: () => void;
  onAdd: () => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const cancelled = useRef(false);

  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-muted/20 px-2 py-1" role="tablist" aria-label="Query tabs">
      {challengeTitle && (
        <button
          type="button"
          role="tab"
          aria-selected={activeId === null}
          onClick={onSelectChallenge}
          className={cn(
            "flex h-7 max-w-44 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            activeId === null ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:bg-muted/60",
          )}
        >
          <Target className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{challengeTitle}</span>
        </button>
      )}
      {tabs.map((t, i) => {
        const active = activeId === t.id;
        return (
          <span key={t.id} className={cn("group flex h-7 shrink-0 items-center rounded-md", active ? "bg-background shadow-sm" : "hover:bg-muted/60")}>
            {editing === t.id ? (
              <input
                autoFocus
                defaultValue={t.name}
                maxLength={MAX_TAB_NAME}
                aria-label={`Rename ${t.name}`}
                className="h-6 w-28 rounded border bg-background px-1.5 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => {
                  if (!cancelled.current) onRename(t.id, e.currentTarget.value);
                  cancelled.current = false;
                  setEditing(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    cancelled.current = true;
                    e.currentTarget.blur();
                  }
                }}
              />
            ) : (
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(t.id)}
                onDoubleClick={() => setEditing(t.id)}
                onKeyDown={(e) => e.key === "F2" && setEditing(t.id)}
                title={`${t.name} (Alt+${i + 1}). Double-click or F2 to rename.`}
                className={cn("h-7 max-w-32 truncate rounded-md pl-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", active ? "font-medium" : "text-muted-foreground", tabs.length > 1 || t.code ? "pr-0.5" : "pr-2")}
              >
                {t.name}
              </button>
            )}
            {editing !== t.id && (tabs.length > 1 || t.code) && (
              <button
                type="button"
                onClick={() => onClose(t.id)}
                aria-label={`Close ${t.name}`}
                className="mr-0.5 grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-3" aria-hidden />
              </button>
            )}
          </span>
        );
      })}
      <Button type="button" size="icon-sm" variant="ghost" className="size-7 shrink-0" onClick={onAdd} disabled={tabs.length >= MAX_TABS} aria-label="New query tab" title={tabs.length >= MAX_TABS ? `At most ${MAX_TABS} tabs` : "New query tab"}>
        <Plus />
      </Button>
    </div>
  );
}
