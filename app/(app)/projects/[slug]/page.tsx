import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MessageCircleQuestion } from "lucide-react";
import { ProjectTracker } from "@/components/web/project-tracker";
import { ArticleMarkdown } from "@/components/news/article-markdown";
import { BackLink } from "@/components/shared/back-link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { webLessonById, webProjectBySlug } from "@/lib/content";
import { lessonsForProject, projectProgress } from "@/lib/domain/webdev";
import { getBaseResume } from "@/lib/services/resume";
import { getDoneLessons, getProjectState } from "@/lib/services/webdev";

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: webProjectBySlug.get(decodeURIComponent(slug))?.title ?? "Project" };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = webProjectBySlug.get(decodeURIComponent(slug));
  if (!project) notFound();
  const [state, done, base] = await Promise.all([getProjectState(project.slug), getDoneLessons(), getBaseResume()]);
  const prog = projectProgress(project, state?.milestones ?? []);
  const lessons = lessonsForProject(project, webLessonById, new Set(done.keys()));

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/projects">Projects</BackLink>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.title}</h1>
          <ToneBadge tone={project.level === "advanced" ? "warning" : "info"}>{project.level}</ToneBadge>
          <span className="text-sm text-muted-foreground">~{project.hours} hours</span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">{project.summary}</p>
        <div className="mt-3 flex max-w-sm items-center gap-3">
          <Progress value={prog.pct} aria-label="Project progress" className="h-2" />
          <span className="tabular font-mono text-xs text-muted-foreground">
            {prog.done}/{prog.total}
          </span>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Why build this</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{project.why}</p>
              <ArticleMarkdown markdown={project.architecture} />
            </CardContent>
          </Card>

          <h2 className="text-base font-semibold">Milestones</h2>
          <ProjectTracker slug={project.slug} milestones={project.milestones} ticked={state?.milestones ?? []} repoUrl={state?.repoUrl ?? ""} notes={state?.notes ?? ""} hasResume={Boolean(base)} />
        </div>

        <aside className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Learn first</CardTitle>
              <CardDescription>The lessons this project practises.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {lessons.map(({ lesson, done: d }) => (
                  <li key={lesson.id} className="flex items-center gap-2">
                    <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${d ? "border-success bg-success text-white" : ""}`}>{d && <Check className="size-3" aria-label="Done" />}</span>
                    <Link href={`/web/${lesson.id}`} className="hover:underline">
                      {lesson.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Resume bullets</CardTitle>
              <CardDescription>Templates: replace every [X] with a number you measured. Never claim what you did not build.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {project.resume.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <MessageCircleQuestion className="size-4 text-muted-foreground" aria-hidden /> Interview talking points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {project.talking.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-medium">Stretch goals</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {project.stretch.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
