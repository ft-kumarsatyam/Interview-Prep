import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { TailorWorkbench } from "@/modules/resume/components/tailor-workbench";
import { BackLink } from "@/components/shared/back-link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getJob } from "@/modules/jobs/services/jobs";
import { getBaseResume } from "@/modules/resume/services/resume";

export const metadata: Metadata = { title: "Tailor resume" };

export default async function TailorPage({ searchParams }: PageProps<"/resume/tailor">) {
  const { job: jobParam } = await searchParams;
  const [base, job] = await Promise.all([getBaseResume(), typeof jobParam === "string" ? getJob(jobParam) : Promise.resolve(null)]);
  return (
    <>
      <BackLink href="/resume">Resume</BackLink>
      <PageHeader icon={Sparkles} title="Tailor to a job" description="Paste a job description and get a version of your resume aimed at it, without a single invented skill, tool or number." />
      {base ? (
        <TailorWorkbench key={job?.id ?? "free"} baseText={base.text} initialJd={job?.jd ?? ""} initialCompany={job?.company ?? ""} initialRole={job?.title ?? ""} jobId={job?.id} />
      ) : (
        <EmptyState icon={Sparkles} title="Save your resume first" compact>
          <p>Tailoring starts from your saved resume.</p>
          <Button asChild className="mt-3">
            <Link href="/resume">Add your resume</Link>
          </Button>
        </EmptyState>
      )}
    </>
  );
}
