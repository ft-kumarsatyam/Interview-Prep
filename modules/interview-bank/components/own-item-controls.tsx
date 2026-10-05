"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteQuestionAction, updateQuestionAction } from "@/app/(app)/interview-bank/actions";
import { QuestionForm, type QuestionDraft } from "@/modules/interview-bank/components/question-form";
import type { BankItem } from "@/modules/interview-bank/domain/bank";

/** Edit or remove a question you added (or imported, or had drafted). */
export function OwnItemControls({ item }: { item: BankItem }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const btn = "inline-flex min-h-8 items-center gap-1 rounded-md border px-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

  if (editing) {
    const draft: QuestionDraft = { category: item.category, question: item.question, answer: item.answer ?? "", level: item.level, company: item.company ?? "", role: item.role ?? "", round: item.round ?? "", tags: item.tags };
    return (
      <div className="basis-full">
        <QuestionForm
          initial={draft}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={async (q) => {
            const res = await updateQuestionAction({ id: item.id, question: q });
            if (!res.ok) return void toast.error(`${res.error}.`);
            toast.success("Saved");
            setEditing(false);
          }}
        />
      </div>
    );
  }
  return (
    <>
      <button type="button" className={btn} onClick={() => setEditing(true)}>
        <Pencil className="size-3" aria-hidden /> Edit
      </button>
      <button
        type="button"
        className={btn}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await deleteQuestionAction({ id: item.id });
            if (!res.ok) return void toast.error(`${res.error}.`);
            toast.success("Removed");
          })
        }
      >
        <Trash2 className="size-3" aria-hidden /> Delete
      </button>
    </>
  );
}
