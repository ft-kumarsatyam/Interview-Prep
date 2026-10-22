import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { PackTask } from "@/modules/genai-prep/domain/schemas";
import { KindBadge } from "@/modules/genai-sprint/components/kind-badge";
import { TaskToggle } from "@/modules/genai-sprint/components/task-toggle";
import { linksForTask } from "@/modules/genai-sprint/services/task-links";
import { problemBySlug } from "@/core/content";

export function TaskDetail({ task, done }: { task: PackTask; done: boolean }) {
  const links = linksForTask(task.id);
  return (
    <article className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex gap-3">
        <TaskToggle taskId={task.id} done={done} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge kind={task.kind} />
            <span className="font-mono text-xs text-muted-foreground tabular">{task.hours}h</span>
            <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
          </div>
          <p className="text-sm leading-relaxed">{task.text}</p>
        </div>
      </div>
      {task.done_when && (
        <div className="rounded-md bg-muted/60 px-3 py-2 text-sm">
          <span className="font-medium">Done when: </span>
          {task.done_when}
        </div>
      )}
      {(links.course || links.roadmap || links.project) && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {links.course && (
            <li>
              <Link href={links.course} className="text-primary underline-offset-4 hover:underline">
                Course lesson
              </Link>
            </li>
          )}
          {links.roadmap && (
            <li>
              <Link href={links.roadmap} className="text-primary underline-offset-4 hover:underline">
                AI Engineer roadmap
              </Link>
            </li>
          )}
          {links.project && (
            <li>
              <Link href={links.project} className="text-primary underline-offset-4 hover:underline">
                Project spec
              </Link>
            </li>
          )}
        </ul>
      )}
      {task.resources.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Resources</h3>
          <ul className="space-y-2">
            {task.resources.map((r) => (
              <li key={r.id}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-1.5 text-sm hover:text-primary"
                >
                  <span className="truncate">{r.title}</span>
                  {!r.verified && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">unverified</span>
                  )}
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {task.problems.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Problems</h3>
          <ul className="space-y-1 text-sm">
            {task.problems.map((p) => {
              const href = problemBySlug.has(p.slug) ? `/dsa/${p.slug}` : p.url;
              const external = !problemBySlug.has(p.slug);
              return (
                <li key={p.slug}>
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="hover:text-primary"
                  >
                    {p.title}
                    {p.pattern ? ` · ${p.pattern}` : ""}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {task.questions.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Drill questions</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {task.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
