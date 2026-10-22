import { ToneBadge } from "@/components/shared/tone-badge";
import type { PackTask } from "@/modules/genai-prep/domain/schemas";
import { TASK_KIND_LABEL } from "@/modules/genai-sprint/domain/sprint";

const TONE: Record<PackTask["kind"], "primary" | "info" | "success" | "warning" | "neutral"> = {
  setup: "neutral",
  dsa: "info",
  learn: "primary",
  build: "success",
  drill: "warning",
  review: "neutral",
};

export function KindBadge({ kind }: { kind: PackTask["kind"] }) {
  return <ToneBadge tone={TONE[kind]}>{TASK_KIND_LABEL[kind]}</ToneBadge>;
}
