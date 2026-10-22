import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { genaiPrepProjects } from "@/core/genai-prep-pack";

export async function generateMetadata({ params }: PageProps<"/genai-sprint/projects/[projectId]">): Promise<Metadata> {
  const { projectId } = await params;
  const p = genaiPrepProjects.projects.find((x) => x.id === decodeURIComponent(projectId));
  return { title: p ? `Project · ${p.name}` : "Project" };
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </section>
  );
}

export default async function GenaiSprintProjectPage({ params }: PageProps<"/genai-sprint/projects/[projectId]">) {
  const { projectId: raw } = await params;
  const project = genaiPrepProjects.projects.find((p) => p.id === decodeURIComponent(raw));
  if (!project) notFound();

  return (
    <div className="space-y-8">
      <div>
        <BackLink href="/genai-sprint/projects">Projects</BackLink>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{project.pitch}</p>
        <p className="mt-1 text-sm">{project.why_it_stands_out}</p>
      </div>
      <ListSection title="MVP" items={project.mvp} />
      <ListSection title="Architecture" items={project.architecture} />
      <ListSection title="Key decisions" items={project.key_decisions} />
      <ListSection title="Evaluation" items={project.evaluation} />
      <ListSection title="Failure modes to demo" items={project.failure_modes_to_show} />
      <ListSection title="Deliverables (submission checklist)" items={project.deliverables} />
      <ListSection title="Talking points" items={project.talking_points} />
      <ListSection title="Stack" items={project.stack} />
      {project.resources.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold">Resources</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {project.resources.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                  {r.title}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-sm">
        <Link href="/courses/genai/sprint-portfolio-drills" className="text-primary hover:underline">
          Course: portfolio drills
        </Link>
      </p>
    </div>
  );
}
