import { CalendarClock } from "lucide-react";

type Props = { carryOver?: string | null; forecast?: string | null };

/** Warning strip for work carried over and the DSA finish forecast. */
export function PlanUpdateBanner({ carryOver, forecast }: Props) {
  if (!carryOver && !forecast) return null;
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm" aria-label="Plan update">
      <p className="mb-1 flex items-center gap-2 font-medium">
        <CalendarClock className="size-4 text-warning" aria-hidden /> Plan update
      </p>
      <ul className="space-y-1 text-muted-foreground">
        {carryOver && <li>{carryOver}</li>}
        {forecast && <li>{forecast}</li>}
      </ul>
    </div>
  );
}
