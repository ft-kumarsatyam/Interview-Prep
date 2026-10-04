import Link from "next/link";
import { Chip, chipClass } from "@/components/shared/chip";
import { cn } from "@/core/utils";
import { DIFFICULTIES, type Difficulty } from "@/modules/quiz/lib/question";

const LABELS: Record<Difficulty | "any", string> = { any: "Any", easy: "Easy", medium: "Medium", hard: "Hard" };

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
          <Link key={label} href={hrefFor(d)} aria-current={active ? "true" : undefined} className={chipClass(active)} scroll={false}>
            {label}
          </Link>
        ) : (
          <Chip key={label} pressed={active} onClick={() => onChange?.(d)}>
            {label}
          </Chip>
        );
      })}
    </div>
  );
}
