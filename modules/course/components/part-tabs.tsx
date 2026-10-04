"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Tabs for a lesson's parts (for example HLD and LLD). The content is rendered on the server. */
export function PartTabs({ parts }: { parts: Array<{ id: string; label: string; content: ReactNode }> }) {
  if (parts.length === 1) return <>{parts[0].content}</>;
  return (
    <Tabs defaultValue={parts[0].id} className="gap-4">
      <TabsList aria-label="Lesson parts">
        {parts.map((p) => (
          <TabsTrigger key={p.id} value={p.id}>
            {p.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {parts.map((p) => (
        <TabsContent key={p.id} value={p.id} className="space-y-4">
          {p.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
