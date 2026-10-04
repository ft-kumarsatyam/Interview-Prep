"use client";

import { useOptimistic, useTransition } from "react";
import { Pin, PinOff } from "lucide-react";
import { toast } from "sonner";
import { pinAction } from "@/app/(app)/targets/actions";
import { Button } from "@/components/ui/button";

/** Pin or unpin a problem or case for one target. Pins join the set even when the tier wouldn't pick them. */
export function PinButton({ id, kind, refId, pinned, label }: { id: string; kind: "dsa" | "design"; refId: string; pinned: boolean; label: string }) {
  const [value, setValue] = useOptimistic(pinned);
  const [, start] = useTransition();
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-pressed={value}
      aria-label={`${value ? "Unpin" : "Pin"} ${label}`}
      title={value ? "Unpin" : "Pin to this company"}
      onClick={() =>
        start(async () => {
          setValue(!value);
          const res = await pinAction({ id, kind, ref: refId, pinned: !value });
          if (!res.ok) toast.error(`${res.error}.`);
        })
      }
    >
      {value ? <PinOff /> : <Pin />}
    </Button>
  );
}
