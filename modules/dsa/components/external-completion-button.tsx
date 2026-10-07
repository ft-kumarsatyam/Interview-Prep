"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateExternalProgressAction } from "@/app/(app)/dsa/actions";

export function ExternalCompletionButton({ itemId, gfg = false }: { itemId: string; gfg?: boolean }) {
  const [saving, startSaving] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={saving}
      loading={saving}
      onClick={() => startSaving(async () => {
        const result = await updateExternalProgressAction({ itemId, status: "completed", gfgCompleted: gfg });
        if (result.ok) toast.success(gfg ? "GFG completion saved" : "Question marked complete");
        else toast.error(result.error);
      })}
    >
      <Check className="size-3.5" aria-hidden /> {gfg ? "GFG done" : "Done"}
    </Button>
  );
}
