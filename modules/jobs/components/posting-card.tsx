"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, EyeOff, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { savePostingAction, setDismissedAction } from "@/app/(app)/jobs/discover-actions";
import { ToneBadge } from "@/components/shared/tone-badge";
import type { Tone } from "@/components/shared/stat-tile";
import { Button } from "@/components/ui/button";
import { AGGREGATOR_LABEL, type Aggregator } from "@/modules/jobs/domain/job-postings";

export interface CardPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean | null;
  source: string;
  tier: string;
  postedAt: string | null;
  isNew: boolean;
  dismissed: boolean;
  savedJobId: string | null;
  score: number;
  reasons: string[];
  tierName: string;
}

const tone = (s: number): Tone => (s >= 75 ? "success" : s >= 55 ? "info" : "neutral");
const ago = (iso: string | null) => {
  if (!iso) return "date unknown";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d < 30 ? `${d} days ago` : `${Math.floor(d / 30)} mo ago`;
};
const sourceLabel = (s: string) => (s in AGGREGATOR_LABEL ? AGGREGATOR_LABEL[s as Aggregator] : "Company page");

/** One discovered job: the match at a glance, with save and hide. Opening it shows the description and the resume tools. */
export function PostingCard({ p }: { p: CardPosting }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(Boolean(p.savedJobId));
  const [hidden, setHidden] = useState(p.dismissed);

  const save = () =>
    start(async () => {
      const res = await savePostingAction({ id: p.id });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setSaved(true);
      toast.success(res.duplicate ? "Already in your tracker" : "Saved to your tracker");
    });
  const hide = (dismissed: boolean) =>
    start(async () => {
      const res = await setDismissedAction({ id: p.id, dismissed });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setHidden(dismissed);
    });

  return (
    <li className={`rounded-xl border bg-card p-4 ring-1 ring-foreground/5 ${hidden ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/jobs/discover/${p.id}`} className="min-w-0 text-base font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              {p.title}
            </Link>
            {p.isNew && <ToneBadge tone="primary">New</ToneBadge>}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {p.company}
            {p.tierName ? ` · ${p.tierName}` : ""}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {p.location && <span>{p.location.length > 60 ? `${p.location.slice(0, 57)}…` : p.location}</span>}
            {p.remote && <ToneBadge tone="info">Remote</ToneBadge>}
            <span>{ago(p.postedAt)}</span>
            <span>{sourceLabel(p.source)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span title={p.reasons.join(". ")}>
            <ToneBadge tone={tone(p.score)}>{p.score}% match</ToneBadge>
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={save} disabled={pending || saved} aria-label={saved ? "Saved to tracker" : `Save ${p.title} to tracker`}>
              {saved ? <BookmarkCheck /> : <Bookmark />} {saved ? "Saved" : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => hide(!hidden)} disabled={pending} aria-label={hidden ? "Show again" : `Hide ${p.title}`}>
              {hidden ? <Undo2 /> : <EyeOff />}
            </Button>
          </div>
        </div>
      </div>
      {p.reasons.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{p.reasons.slice(0, 3).join(" · ")}</p>}
    </li>
  );
}
