"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { toggleSprintTaskAction } from "@/app/(app)/genai-sprint/actions";

export function TaskToggle({ taskId, done: initial }: { taskId: string; done: boolean }) {
  const [done, setDone] = useState(initial);
  const [pending, start] = useTransition();
  const toggle = () => {
    const next = !done;
    setDone(next);
    start(async () => {
      const res = await toggleSprintTaskAction({ taskId, done: next });
      if (!res.ok) {
        setDone(!next);
        toast.error(res.error ?? "Couldn't save");
      }
    });
  };
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? "Mark task incomplete" : "Mark task complete"}
      disabled={pending}
      onClick={toggle}
      className={`grid size-7 shrink-0 place-items-center rounded-md border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:size-9 ${done ? "border-success bg-success text-white" : "bg-background"}`}
    >
      {done && <Check className="size-4" aria-hidden />}
    </button>
  );
}
