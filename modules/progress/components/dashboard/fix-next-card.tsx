import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MistakesOverview } from "@/modules/quiz/services/practice";

export function FixNextCard({ mistakes }: { mistakes: MistakesOverview }) {
  if (mistakes.total === 0) return null;
  const first = mistakes.top[0];
  return (
    <Card className="border-warning/30">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><CircleAlert className="size-4 text-warning" aria-hidden /> Fix next</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{mistakes.total} question{mistakes.total === 1 ? "" : "s"} need another pass.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/quiz/mistakes">Review all <ArrowRight /></Link></Button>
      </CardHeader>
      {first && (
        <CardContent className="pt-0">
          <Link href="/quiz/mistakes" className="block rounded-lg border bg-muted/40 p-3 text-sm transition-colors hover:bg-muted">
            <span className="font-medium">{first.where}</span>
            <span className="mt-1 block line-clamp-2 text-muted-foreground">{first.prompt}</span>
            <span className="mt-2 block text-xs text-warning">{first.wrong} miss{first.wrong === 1 ? "" : "es"} · practise this next</span>
          </Link>
        </CardContent>
      )}
    </Card>
  );
}
