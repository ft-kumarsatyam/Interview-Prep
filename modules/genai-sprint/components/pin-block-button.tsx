"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { pinSprintBlockAction } from "@/app/(app)/genai-sprint/actions";
import { Button } from "@/components/ui/button";

export function PinBlockButton({ blockId, pinned }: { blockId: string; pinned: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={pinned ? "default" : "outline"}
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await pinSprintBlockAction({ blockId: pinned ? null : blockId });
          if (!res.ok) toast.error(res.error ?? "Couldn't save");
        })
      }
    >
      {pinned ? "Pinned week" : "Pin this week"}
    </Button>
  );
}
