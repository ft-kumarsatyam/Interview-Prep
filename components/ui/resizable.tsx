"use client";

import { GripHorizontal, GripVertical } from "lucide-react";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";
import { cn } from "@/core/utils";

/** Resizable panes (react-resizable-panels v4). Pass `storageId` to remember sizes in localStorage. */
function ResizablePanelGroup({
  className,
  storageId,
  orientation = "horizontal",
  panelIds,
  ...props
}: React.ComponentProps<typeof Group> & { storageId?: string; panelIds?: string[] }) {
  const saved = useDefaultLayout({ id: storageId ?? "unsaved", panelIds, storage: storageId && typeof window !== "undefined" ? window.localStorage : undefined });
  return (
    <Group
      data-slot="resizable-group"
      orientation={orientation}
      className={cn("flex h-full w-full", orientation === "vertical" && "flex-col", className)}
      {...(storageId ? { defaultLayout: saved.defaultLayout, onLayoutChanged: saved.onLayoutChanged } : {})}
      {...props}
    />
  );
}

function ResizablePanel({ className, ...props }: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" className={cn("min-h-0 min-w-0", className)} {...props} />;
}

function ResizableHandle({ className, orientation = "horizontal" }: { className?: string; orientation?: "horizontal" | "vertical" }) {
  const Icon = orientation === "horizontal" ? GripVertical : GripHorizontal;
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "group relative flex shrink-0 items-center justify-center bg-transparent transition-colors outline-none hover:bg-primary/15 focus-visible:bg-primary/30 data-[separator=active]:bg-primary/30 data-[separator=hover]:bg-primary/20",
        orientation === "horizontal" ? "w-2 cursor-col-resize" : "h-2 cursor-row-resize",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-sm border bg-border text-muted-foreground",
          orientation === "horizontal" ? "h-6 w-1.5" : "h-1.5 w-6",
        )}
      >
        <Icon className="size-2.5 opacity-0 group-hover:opacity-100" aria-hidden />
      </span>
    </Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
