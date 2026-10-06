import Link from "next/link";
import { Check, ChevronRight, Circle, Lock, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToneBadge } from "@/components/shared/tone-badge";
import type { StudyFlowItem } from "@/modules/study-flow/domain/study-flow";

const bucketLabel = { required: "Required", recommended: "Recommended", optional: "Optional" } as const;

export function StudyFlowCard({ items, nextId }: { items: readonly StudyFlowItem[]; nextId?: string }) {
  const open = items.filter((item) => !item.done);
  return (
    <Card id="study-flow" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" aria-hidden /> Study flow</CardTitle>
        <CardDescription>One next action across your plan, roadmaps, courses and practice. Required work still controls the streak.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {open.length === 0 ? (
          <p className="rounded-lg bg-success/10 p-3 text-sm text-success">Everything in today&apos;s flow is complete.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={`group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted ${item.id === nextId ? "border-primary/50 bg-primary/5" : ""}`}>
                  {item.done ? <Check className="size-4 shrink-0 text-success" aria-hidden /> : item.locked ? <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className={item.done ? "text-muted-foreground line-through" : undefined}>{item.title}</span>
                      <ToneBadge tone={item.bucket === "required" ? "primary" : item.bucket === "recommended" ? "info" : "neutral"}>{bucketLabel[item.bucket]}</ToneBadge>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{item.reason} · {item.minutes} min</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
