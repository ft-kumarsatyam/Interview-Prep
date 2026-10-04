"use client";

import type { ComponentProps } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/core/utils";

/** Dense tab strip for panes inside the IDE (test cases, result, console). One place for the overrides. */
export function CompactTabsList({ className, ...props }: ComponentProps<typeof TabsList>) {
  return <TabsList className={cn("h-8 bg-transparent p-0", className)} {...props} />;
}

export function CompactTabsTrigger({ className, ...props }: ComponentProps<typeof TabsTrigger>) {
  return <TabsTrigger className={cn("h-7 px-2.5 text-xs data-[state=active]:bg-background", className)} {...props} />;
}
