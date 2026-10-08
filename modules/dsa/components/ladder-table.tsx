import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils";
import type { ExternalProgress, ExternalQuestion } from "@/modules/dsa/domain/external-catalogue";
import { ExternalCompletionButton } from "@/modules/dsa/components/external-completion-button";

const STATUS_LABEL: Record<ExternalProgress, string> = { "not-started": "To do", "in-progress": "In progress", completed: "Done" };
const STATUS_CLASS: Record<ExternalProgress, string> = {
  "not-started": "bg-muted text-muted-foreground",
  "in-progress": "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
};

export function StatusPill({ status }: { status: ExternalProgress }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_CLASS[status])}>{STATUS_LABEL[status]}</span>;
}

/** The in-app address of a sheet row, carrying the sheet and section so the problem page links back and steps through siblings. */
export function sheetProblemHref(question: Pick<ExternalQuestion, "localSlug" | "sheetId" | "section">): string | null {
  if (!question.localSlug) return null;
  const query = new URLSearchParams({ sheet: question.sheetId, section: question.section });
  return `/dsa/${question.localSlug}?${query.toString()}`;
}

function RowLinks({ question }: { question: ExternalQuestion }) {
  const links = question.links.filter((link) => link.scope === "item");
  const services = question.companies.filter((tag) => tag.sourceKind === "gfg" || tag.sourceKind === "code360");
  const product = question.companies.filter((tag) => !services.includes(tag)).map((tag) => tag.company);
  if (!links.length && !question.companies.length && !question.notes) return null;
  return (
    <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
      {question.notes && <p>{question.notes}</p>}
      {product.length > 0 && <p>{product.join(", ")}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {links.map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            {link.label}<ExternalLink className="size-3" aria-hidden />
          </a>
        ))}
        {services.map((tag) => tag.sourceUrl && (
          <a key={`${tag.company}-${tag.sourceUrl}`} href={tag.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            {tag.company}<ExternalLink className="size-3" aria-hidden />
          </a>
        ))}
      </div>
    </div>
  );
}

function OpenButton({ question, className }: { question: ExternalQuestion; className?: string }) {
  const href = sheetProblemHref(question);
  if (!href) return null;
  return (
    <Button size="sm" asChild className={className}>
      <Link href={href}>Open<ArrowRight className="size-3.5" aria-hidden /></Link>
    </Button>
  );
}

/** A pattern ladder: a table on wide screens, one card per row on phones. */
export function LadderTable({
  questions,
  statuses,
  showStage,
}: {
  questions: readonly ExternalQuestion[];
  statuses: ReadonlyMap<string, ExternalProgress>;
  showStage: boolean;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">ID</th>
              {showStage && <th scope="col" className="px-3 py-2 font-medium">Stage</th>}
              <th scope="col" className="px-3 py-2 font-medium">Task</th>
              <th scope="col" className="px-3 py-2 font-medium">Difficulty</th>
              <th scope="col" className="px-3 py-2 font-medium">Pattern</th>
              <th scope="col" className="px-3 py-2 font-medium">Signal</th>
              <th scope="col" className="px-3 py-2 font-medium">Skill</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
              <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {questions.map((question) => {
              const status = statuses.get(question.id) ?? "not-started";
              const href = sheetProblemHref(question);
              return (
                <tr key={question.id} className="align-top">
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{question.code}</td>
                  {showStage && <td className="px-3 py-2.5 text-xs text-muted-foreground">{question.section}</td>}
                  <td className="max-w-80 px-3 py-2.5">
                    {href ? <Link href={href} className="font-medium hover:text-primary hover:underline">{question.prompt ?? question.title}</Link> : <span className="font-medium">{question.prompt ?? question.title}</span>}
                    {question.prompt && question.prompt !== question.title && <p className="text-xs text-muted-foreground">{question.title}</p>}
                    <RowLinks question={question} />
                  </td>
                  <td className="px-3 py-2.5"><DifficultyBadge difficulty={question.difficulty} /></td>
                  <td className="px-3 py-2.5 text-xs">{question.category}</td>
                  <td className="max-w-56 px-3 py-2.5 text-xs text-muted-foreground">{question.recognitionSignal}</td>
                  <td className="max-w-44 px-3 py-2.5 text-xs">{question.technique}</td>
                  <td className="px-3 py-2.5"><StatusPill status={status} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <OpenButton question={question} />
                      {status !== "completed" && <ExternalCompletionButton itemId={question.id} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {questions.map((question) => {
          const status = statuses.get(question.id) ?? "not-started";
          return (
            <li key={question.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{question.code}</span>
                <DifficultyBadge difficulty={question.difficulty} />
                <StatusPill status={status} />
                <span className="text-xs text-muted-foreground">{question.category}</span>
              </div>
              <p className="mt-1.5 font-medium">{question.prompt ?? question.title}</p>
              {question.recognitionSignal && <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Signal:</span> {question.recognitionSignal}</p>}
              {question.technique && <p className="mt-0.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">Skill:</span> {question.technique}</p>}
              <RowLinks question={question} />
              <div className="mt-2.5 flex gap-1.5">
                <OpenButton question={question} className="flex-1" />
                {status !== "completed" && <ExternalCompletionButton itemId={question.id} />}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
