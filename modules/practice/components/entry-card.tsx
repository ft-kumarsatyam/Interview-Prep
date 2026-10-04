import Link from "next/link";
import { BookOpen, Brain, Code2, Layers, Network } from "lucide-react";
import { ToneBadge } from "@/components/shared/tone-badge";
import type { Tone } from "@/components/shared/stat-tile";
import { KIND_LABEL, STATUS_LABEL, type EntryStatus, type PracticeEntry, type PracticeKind } from "@/modules/practice/domain/catalog";

const ICON: Record<PracticeKind, typeof Code2> = { quiz: BookOpen, case: Network, code: Code2, flashcards: Layers, aptitude: Brain };
const TONE: Record<EntryStatus, Tone> = { new: "neutral", started: "info", mastered: "success" };

/** One thing you can practise: what it is, how far you are, and a link to the runner. */
export function PracticeEntryCard({ entry }: { entry: PracticeEntry }) {
  const Icon = ICON[entry.kind];
  return (
    <li>
      <Link href={entry.href} className="flex h-full gap-3 rounded-xl border bg-card p-3 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold">{entry.title}</span>
            <ToneBadge tone={TONE[entry.status]}>{STATUS_LABEL[entry.status]}</ToneBadge>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {KIND_LABEL[entry.kind]} · {entry.detail}
          </span>
        </span>
      </Link>
    </li>
  );
}
