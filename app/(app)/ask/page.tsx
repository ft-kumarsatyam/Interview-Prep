import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { AskNotes } from "@/modules/ai/components/ask-notes";

export const metadata: Metadata = { title: "Ask your notes" };

export default function AskPage() {
  return (
    <>
      <PageHeader
        title="Ask your notes"
        icon={Sparkles}
        description="Answers come only from your authored lessons and saved articles, with citations. If it isn't in your notes, it says so."
      />
      <AskNotes />
    </>
  );
}
