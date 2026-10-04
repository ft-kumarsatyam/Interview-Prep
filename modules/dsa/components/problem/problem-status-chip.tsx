import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { ToneBadge } from "@/components/shared/tone-badge";
import { formatDate } from "@/core/plan-clock";
import type { ProblemDetail } from "@/modules/dsa/services/problems";

/** Solved / attempted / not started badge. */
export function ProblemStatusChip({ progress, lastSolved }: { progress: ProblemDetail["progress"]; lastSolved?: string }) {
  if (progress?.status === "solved") {
    return (
      <ToneBadge tone="success" icon={CheckCircle2}>
        Solved{lastSolved && ` · ${formatDate(lastSolved, { day: "numeric", month: "short" })}`}
      </ToneBadge>
    );
  }
  if (progress?.status === "attempted") {
    return (
      <ToneBadge tone="warning" icon={CircleDot}>
        Attempted
      </ToneBadge>
    );
  }
  return (
    <ToneBadge tone="neutral" icon={Circle}>
      Not started
    </ToneBadge>
  );
}
