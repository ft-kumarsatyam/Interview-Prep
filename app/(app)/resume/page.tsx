import type { Metadata } from "next";
import { FileText } from "lucide-react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { VersionList } from "@/modules/resume/components/version-list";
import { Button } from "@/components/ui/button";
import { ResumeWorkbench } from "@/modules/resume/components/resume-workbench";
import { PageHeader } from "@/components/shared/page-header";
import { effectiveRoastLevel } from "@/modules/resume/domain/roast";
import { getBaseResume, listProfiles, listVersions } from "@/modules/resume/services/resume";
import { getSettings } from "@/modules/settings/services/settings";
import { NextStep } from "@/modules/jobs/components/next-step";
import { getJobOverview } from "@/modules/jobs/services/job-overview";
import { todayIn } from "@/modules/planner/services/plan";

export const metadata: Metadata = { title: "Resume" };

export default async function ResumePage({ searchParams }: PageProps<"/resume">) {
  const { r } = await searchParams;
  const [base, settings, versions, profiles] = await Promise.all([getBaseResume(), getSettings(), listVersions(), listProfiles()]);
  const overview = await getJobOverview(todayIn(settings));
  const profile = typeof r === "string" ? profiles.find((p) => p.id === r) : undefined;
  return (
    <>
      <PageHeader
        icon={FileText}
        title="Resume"
        description="Upload or paste your resume to see how an applicant tracking system reads it, score it against a job description, and get it roasted with concrete fixes."
      >
        {base && !profile && (
          <Button asChild>
            <Link href="/resume/tailor">
              <Sparkles /> Tailor to a job
            </Link>
          </Button>
        )}
      </PageHeader>
      <NextStep next={overview.next} />
      <ResumeWorkbench key={profile?.id ?? "base"} initialText={(profile ?? base)?.text ?? ""} saved={Boolean(profile ?? base)} profileId={profile?.id} roastLevel={effectiveRoastLevel(settings.roastLevel, settings.roastMode)} />
    <VersionList profiles={profiles.map((p) => ({ id: p.id, label: p.label, updatedAt: p.updatedAt }))} baseId={base?.id ?? null} versions={versions.map((v) => ({ id: v.id, label: v.label, company: v.company, role: v.role, updatedAt: v.updatedAt, score: null }))} />
    </>
  );
}
