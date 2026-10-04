"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * CodeMirror is the heaviest client dependency, so every workspace loads it through this wrapper:
 * it becomes its own chunk, fetched when an editor first mounts.
 */
export const CodeEditor = dynamic(() => import("./code-editor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-48 w-full rounded-md" aria-hidden />,
});
