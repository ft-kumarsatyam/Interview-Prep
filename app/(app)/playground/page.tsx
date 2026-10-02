import type { Metadata } from "next";
import { SquareTerminal } from "lucide-react";
import { Playground } from "@/components/playground/playground";
import { PageHeader } from "@/components/shared/page-header";
import { listSnippets } from "@/lib/services/snippets";

export const metadata: Metadata = { title: "JS Playground" };

/** `?snippet=` is a saved snippet id or base64url-encoded code (e.g. from a quiz question). */
function decodeSnippetParam(raw: string | undefined, saved: Array<{ id: string; code: string }>): string | undefined {
  if (!raw) return undefined;
  const byId = saved.find((s) => s.id === raw);
  if (byId) return byId.code;
  if (raw.length > 8000) return undefined;
  try {
    return Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    return undefined;
  }
}

export default async function PlaygroundPage({ searchParams }: PageProps<"/playground">) {
  const { snippet } = await searchParams;
  const snippets = await listSnippets();
  const initialCode = decodeSnippetParam(typeof snippet === "string" ? snippet : undefined, snippets);
  return (
    <>
      <PageHeader
        icon={SquareTerminal}
        title="JS Playground"
        description="Experiment with JavaScript or TypeScript, save snippets by topic, and train your intuition with predict-the-output drills. Code runs in a sandboxed Web Worker."
      />
      <Playground snippets={snippets} initialCode={initialCode} />
    </>
  );
}
