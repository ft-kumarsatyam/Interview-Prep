import type { Metadata } from "next";
import { SquareTerminal } from "lucide-react";
import { ComingInPhase } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "JS Playground" };

export default function PlaygroundPage() {
  return (
    <>
      <PageHeader title="JS Playground" description="Run JavaScript snippets in a sandbox while you learn." />
      <ComingInPhase icon={SquareTerminal} title="Sandboxed JS runner" phase={4}>
        Editor + console running in a Web Worker, with saved snippets and event-loop output-prediction drills.
      </ComingInPhase>
    </>
  );
}
