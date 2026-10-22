import type { Metadata } from "next";
import Link from "next/link";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { genaiPrepProjects } from "@/core/genai-prep-pack";

export const metadata: Metadata = { title: "GenAI sprint · Projects" };

export default function GenaiSprintProjectsPage() {
  const byId = new Map(genaiPrepProjects.projects.map((p) => [p.id, p]));
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Hammer}
        title="Flagship projects"
        description={genaiPrepProjects.note}
      />
      <section className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <p className="font-medium">Recommended build order before applying</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {genaiPrepProjects.recommended_order.map((id) => (
            <li key={id}>
              <Link href={`/genai-sprint/projects/${id}`} className="text-primary hover:underline">
                {byId.get(id)?.name ?? id}
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <ul className="space-y-3">
        {genaiPrepProjects.projects.map((p) => (
          <li key={p.id} className="rounded-lg border p-4">
            <Link href={`/genai-sprint/projects/${p.id}`} className="text-base font-semibold hover:text-primary">
              {p.name}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{p.pitch}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {p.plan_week} · {p.build_days} build days
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
