import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { JobsTabs } from "@/components/jobs/jobs-tabs";
import { SearchLinks } from "@/components/jobs/search-links";
import { PageHeader } from "@/components/shared/page-header";
import { careerDeepLinks, tierProfiles } from "@/lib/content";
import { getJobPrefs } from "@/lib/services/job-discovery";
import { listJobs } from "@/lib/services/jobs";

export const metadata: Metadata = { title: "Job search links" };

export default async function LinksPage() {
  const [prefs, tracked] = await Promise.all([getJobPrefs(), listJobs()]);
  const tierName = new Map<string, string>(tierProfiles.map((t) => [t.id, t.name]));
  return (
    <>
      <PageHeader icon={Briefcase} title="Jobs" description="Search LinkedIn, Naukri, Indeed, Wellfound and the big companies' own career pages in one click, with your role and place filled in." />
      <JobsTabs active="links" trackerCount={tracked.length} />
      <SearchLinks
        initialRole={prefs.roles[0] ?? ""}
        initialLocation={prefs.locations[0] ?? ""}
        initialRemote={false}
        companies={careerDeepLinks.map((c) => ({ id: c.id, name: c.name, tierName: tierName.get(c.tier) ?? "", careersUrl: c.careersUrl, ...(c.searchTemplate ? { searchTemplate: c.searchTemplate } : {}) }))}
      />
    </>
  );
}
