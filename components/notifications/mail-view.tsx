import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatTile, type Tone } from "@/components/shared/stat-tile";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { MailSection, MailSpec, MailTone } from "@/lib/domain/mail-html";
import { cn } from "@/lib/utils";

const TONE: Record<MailTone, Tone> = { neutral: "neutral", good: "success", warn: "warning", bad: "danger", info: "info" };

const EDGE: Record<MailTone, string> = {
  neutral: "border-l-border",
  good: "border-l-success",
  warn: "border-l-warning",
  bad: "border-l-destructive",
  info: "border-l-info",
};

const CALLOUT: Record<MailTone, string> = {
  neutral: "bg-muted text-foreground",
  good: "bg-success/10 text-success",
  warn: "bg-warning/10 text-warning",
  bad: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
};

/** App paths only: the spec comes from our own builders, but a stored doc shouldn't link off-site. */
const safePath = (p: string) => (p.startsWith("/") && !p.startsWith("//") ? p : "/dashboard");

function Section({ s }: { s: MailSection }) {
  const tone = s.tone ?? "neutral";
  return (
    <Card size="sm" className={cn("border-l-4", EDGE[tone])}>
      <CardHeader>
        <CardTitle className="text-sm">{s.heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {s.lines && s.lines.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-pretty">
            {s.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
        {s.bars?.map((b) => (
          <div key={b.label} className="space-y-1">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{b.label}</span>
              <span className="font-mono tabular-nums">{b.pct}%</span>
              {b.detail && <span className="text-xs text-muted-foreground">{b.detail}</span>}
            </p>
            <Progress value={Math.max(0, Math.min(100, b.pct))} />
          </div>
        ))}
        {s.items && s.items.length > 0 && (
          <ul className="divide-y rounded-md border">
            {s.items.map((it) => (
              <li key={`${it.path}:${it.title}`}>
                <Link href={safePath(it.path)} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/50">
                  <span className="min-w-0 truncate font-medium">{it.title}</span>
                  {it.note && <span className="shrink-0 text-xs text-muted-foreground">{it.note}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {s.more && s.more.count > 0 && (
          <Link href={safePath(s.more.path)} className="inline-block text-xs text-muted-foreground hover:text-foreground">
            +{s.more.count} more{s.more.label ? ` ${s.more.label}` : ""}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

/** The same message the email shows, drawn with the app's own components. All text renders as text. */
export function MailView({ spec, roast }: { spec: MailSpec; roast?: string | null }) {
  const cta = spec.cta ?? { label: "Open dashboard", path: "/dashboard" };
  return (
    <div className="space-y-4">
      {roast && <p className="rounded-lg bg-primary/10 px-4 py-3 text-base font-semibold text-pretty text-primary">{roast}</p>}
      <div>
        {spec.kicker && <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{spec.kicker}</p>}
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{spec.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">{spec.intro}</p>
      </div>
      {spec.callouts?.map((c, i) => (
        <p key={i} className={cn("rounded-md px-3 py-2 text-sm text-pretty", CALLOUT[c.tone])}>
          {c.text}
        </p>
      ))}
      {spec.stats && spec.stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {spec.stats.map((s) => (
            <StatTile key={s.label} label={s.label} value={s.value} tone={TONE[s.tone ?? "neutral"]} />
          ))}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {spec.sections.map((s) => (
          <Section key={s.heading} s={s} />
        ))}
      </div>
      {spec.footer?.map((f, i) => (
        <p key={i} className="text-sm text-pretty text-muted-foreground">
          {f}
        </p>
      ))}
      <Link href={safePath(cta.path)} className={buttonVariants()}>
        {cta.label} <ArrowRight />
      </Link>
    </div>
  );
}
