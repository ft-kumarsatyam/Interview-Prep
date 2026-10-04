"use client";

import { updateProblemNotes } from "@/app/(app)/dashboard/actions";
import { MarkdownNotes } from "@/components/shared/markdown-notes";

export function ProblemNotes({ slug, initial }: { slug: string; initial: string }) {
  return (
    <MarkdownNotes
      initial={initial}
      onSave={(notes) => updateProblemNotes({ slug, notes })}
      placeholder={"## Idea\n\n## Edge cases\n\n## Code\n```js\n```"}
    />
  );
}
