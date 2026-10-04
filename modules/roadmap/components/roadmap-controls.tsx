"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { joinRoadmapAction, setChecklistItemAction, setLinkReadAction, setNodeManualAction } from "@/app/(app)/roadmaps/actions";
import { Button } from "@/components/ui/button";

export function JoinButton({ roadmapId, joined }: { roadmapId: string; joined: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={joined ? "outline" : "default"}
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await joinRoadmapAction({ roadmapId, join: !joined });
          if (!res.ok) toast.error(`${res.error}.`);
          else toast.success(joined ? "Left the roadmap. Your progress is kept." : "Joined. Follow the must-do nodes first.");
        })
      }
    >
      {joined ? "Leave roadmap" : "Join roadmap"}
    </Button>
  );
}

/** A learning link: opening it counts as read, and you can untick it. */
export function LinkRow({ roadmapId, nodeId, link, read }: { roadmapId: string; nodeId: string; link: { title: string; url: string; kind: string }; read: boolean }) {
  const [isRead, setRead] = useState(read);
  const [pending, start] = useTransition();
  const save = (value: boolean) =>
    start(async () => {
      const res = await setLinkReadAction({ roadmapId, nodeId, url: link.url, read: value });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setRead(value);
    });
  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={isRead}
        aria-label={`Mark "${link.title}" as read`}
        disabled={pending}
        onClick={() => save(!isRead)}
        className={`grid size-6 shrink-0 place-items-center rounded-md border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:size-8 ${isRead ? "border-success bg-success text-white" : "bg-background"}`}
      >
        {isRead && <Check className="size-3.5" aria-hidden />}
      </button>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => !isRead && save(true)}
        className="inline-flex min-h-9 min-w-0 flex-1 items-center gap-1.5 rounded-md text-sm hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="truncate">{link.title}</span>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{link.kind}</span>
        <ExternalLink className="size-3 shrink-0" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </li>
  );
}

/** One sub-topic of a node, ticked by hand once you can explain it. */
export function ChecklistItem({ roadmapId, nodeId, index, label, checked }: { roadmapId: string; nodeId: string; index: number; label: string; checked: boolean }) {
  const [isChecked, setChecked] = useState(checked);
  const [pending, start] = useTransition();
  const toggle = () => {
    const value = !isChecked;
    setChecked(value);
    start(async () => {
      const res = await setChecklistItemAction({ roadmapId, nodeId, index, done: value });
      if (!res.ok) {
        setChecked(!value);
        toast.error(`${res.error}.`);
      }
    });
  };
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        disabled={pending}
        onClick={toggle}
        className="flex min-h-9 w-full items-start gap-2 rounded-md py-1 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-70"
      >
        <span className={`mt-px grid size-5 shrink-0 place-items-center rounded-md border pointer-coarse:size-6 ${isChecked ? "border-success bg-success text-white" : "bg-background"}`}>
          {isChecked && <Check className="size-3.5" aria-hidden />}
        </span>
        <span className={isChecked ? "text-muted-foreground line-through decoration-muted-foreground/50" : ""}>{label}</span>
      </button>
    </li>
  );
}

/** For something you learned elsewhere: tick the node by hand. */
export function ManualTick({ roadmapId, nodeId, manual }: { roadmapId: string; nodeId: string; manual: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await setNodeManualAction({ roadmapId, nodeId, done: !manual });
          if (!res.ok) toast.error(`${res.error}.`);
        })
      }
    >
      {manual ? "Clear manual tick" : "I already know this"}
    </Button>
  );
}
