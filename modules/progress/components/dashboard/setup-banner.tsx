import { ChevronRight, Wrench } from "lucide-react";
import { LinkCard } from "@/components/shared/link-card";

type Props = { requiredLeft: number; done: number; total: number; items: Array<{ title: string; required: boolean; status: string }> };

/** Nudge to finish required setup steps. Hidden once nothing required is left. */
export function SetupBanner({ requiredLeft, done, total, items }: Props) {
  if (requiredLeft <= 0) return null;
  return (
    <LinkCard href="/setup" className="min-h-0 px-4 py-3 text-sm">
      <Wrench className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="font-medium">
          Finish setup: {done}/{total}
        </span>{" "}
        <span className="text-muted-foreground">
          {items
            .filter((i) => i.required && i.status !== "ok")
            .map((i) => i.title)
            .join(" · ")}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </LinkCard>
  );
}
