"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startTestAction } from "@/app/(app)/genai-test/actions";
import { Button } from "@/components/ui/button";

export function StartTestButton({ kind, level, label, variant = "default" }: { kind: "weekly" | "cumulative" | "level"; level?: number; label: string; variant?: "default" | "outline" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await startTestAction({ kind, level });
          if (res.ok && res.id) router.push(`/genai-test/${res.id}`);
          else toast.error(!res.ok ? res.error : "Couldn't start the test");
        })
      }
    >
      {pending ? "Starting…" : label}
    </Button>
  );
}
