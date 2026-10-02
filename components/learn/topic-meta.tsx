import { Award, Check } from "lucide-react";
import type { TopicStatus } from "@/lib/domain/learn";

export const LEVELS = ["", "Basics", "Intermediate", "Advanced", "Interview / Big-tech"];

export function StatusRing({ done, total, status, mastered, size = 32 }: { done: number; total: number; status: TopicStatus; mastered: boolean; size?: number }) {
  const label = mastered ? "Mastered" : status === "done" ? "Done" : `${done} of ${total} done`;
  if (status === "done") {
    return (
      <span role="img" aria-label={label} className="grid shrink-0 place-items-center rounded-full bg-success/15 text-success" style={{ width: size, height: size }}>
        {mastered ? <Award className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
      </span>
    );
  }
  const r = 13;
  const c = 2 * Math.PI * r;
  const frac = total ? done / total : 0;
  return (
    <span role="img" aria-label={label} className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="16" cy="16" r={r} fill="none" strokeWidth="3" className="stroke-muted" />
        {frac > 0 && <circle cx="16" cy="16" r={r} fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${frac * c} ${c}`} className="stroke-primary" />}
      </svg>
      <span className="tabular font-mono text-[10px] text-muted-foreground">{done}</span>
    </span>
  );
}
