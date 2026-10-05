import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { JobsTabs } from "@/modules/jobs/components/jobs-tabs";
import { ProfilesManager } from "@/modules/jobs/components/profiles-manager";
import { PageHeader } from "@/components/shared/page-header";
import { MAX_PROFILES } from "@/modules/jobs/domain/job-profile";
import { getJobPrefs } from "@/modules/jobs/services/job-discovery";
import { listProfiles } from "@/modules/jobs/services/job-profiles";
import { listJobs } from "@/modules/jobs/services/jobs";

export const metadata: Metadata = { title: "Job profiles" };

export default async function ProfilesPage() {
  const [profiles, prefs, tracked] = await Promise.all([listProfiles(), getJobPrefs(), listJobs()]);
  return (
    <>
      <PageHeader icon={Briefcase} title="Jobs" description="Keep several searches at once, for example a backend search in Bengaluru and a remote one. Each profile filters the jobs read from public company boards by role, place, experience and keywords, and gets its own search links." />
      <JobsTabs active="profiles" trackerCount={tracked.length} />
      <ProfilesManager profiles={profiles} hasPrefs={prefs.roles.length > 0} maxProfiles={MAX_PROFILES} />
    </>
  );
}
