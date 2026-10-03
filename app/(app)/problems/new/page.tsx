import type { Metadata } from "next";
import { ClipboardPaste } from "lucide-react";
import { PasteProblemForm } from "@/components/problems/paste-problem-form";
import { PageHeader } from "@/components/shared/page-header";
import { problems } from "@/lib/content";
import { problemTopics } from "@/lib/domain/problem-topics";

export const metadata: Metadata = { title: "Paste a problem" };

export default function NewProblemPage() {
  return (
    <>
      <PageHeader icon={ClipboardPaste} title="Paste a problem" description="Bring a question from anywhere and practise it in the editor with real test cases." />
      <PasteProblemForm topics={problemTopics(problems)} />
    </>
  );
}
