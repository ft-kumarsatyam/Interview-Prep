import Link from "next/link";
import { cn } from "@/lib/utils";
import { DIFFICULTIES, type Difficulty } from "@/lib/quiz/question";

const LABELS: Record<Difficulty | "any", string> = { any: "Any", easy: "Easy", medium: "Medium", hard: "Hard" };

const chip = (active: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    active ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

/** Any / Easy / Medium / Hard chips. Pass `onChange` for in-page state or `hrefFor` to drive it from the URL. */
export function DifficultyPicker({
  value,
  onChange,
  hrefFor,
  className,
}: {
  value: Difficulty | null;
  onChange?: (d: Difficulty | null) => void;
  hrefFor?: (d: Difficulty | null) => string;
  className?: string;
}) {
  const items: Array<Difficulty | null> = [null, ...DIFFICULTIES];
  return (
    <div role="group" aria-label="Difficulty" className={cn("flex flex-wrap gap-2", className)}>
      {items.map((d) => {
        const active = value === d;
        const label = LABELS[d ?? "any"];
        return hrefFor ? (
          <Link key={label} href={hrefFor(d)} aria-current={active ? "true" : undefined} className={chip(active)} scroll={false}>
            {label}
          </Link>
        ) : (
          <button key={label} type="button" aria-pressed={active} onClick={() => onChange?.(d)} className={chip(active)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
