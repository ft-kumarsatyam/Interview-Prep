import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { chipClass } from "@/components/shared/chip";
import { JobsTabs } from "@/modules/jobs/components/jobs-tabs";
import { ProfileMatches } from "@/modules/jobs/components/profile-matches";
import { SearchLinks } from "@/modules/jobs/components/search-links";
import { PageHeader } from "@/components/shared/page-header";
import { careerDeepLinks, tierProfiles } from "@/core/content";
import { discoverJobs, getJobPrefs } from "@/modules/jobs/services/job-discovery";
import { listProfiles } from "@/modules/jobs/services/job-profiles";
import { listJobs } from "@/modules/jobs/services/jobs";

export const metadata: Metadata = { title: "Job search links" };

export default async function LinksPage({ searchParams }: PageProps<"/jobs/links">) {
  const sp = await searchParams;
  const wanted = Array.isArray(sp.profile) ? sp.profile[0] : sp.profile;
  const [prefs, tracked, profiles] = await Promise.all([getJobPrefs(), listJobs(), listProfiles()]);
  const profile = profiles.find((p) => p.id === wanted) ?? profiles.find((p) => p.enabled) ?? null;
  const found = profile ? await discoverJobs({ profileId: profile.id, limit: 6 }) : null;
  const roles = profile ? profile.roles : prefs.roles;
  const locations = profile ? profile.locations : prefs.locations;
  const tierName = new Map<string, string>(tierProfiles.map((t) => [t.id, t.name]));
  return (
    <>
      <PageHeader icon={Briefcase} title="Jobs" description="Search LinkedIn, Naukri, Indeed, Wellfound and the big companies' own career pages in one click, with the role and place of the profile you pick filled in." />
      <JobsTabs active="links" trackerCount={tracked.length} />
      <div className="space-y-6">
        <nav aria-label="Profiles" className="flex flex-wrap items-center gap-1.5">
          {profiles.map((p) => (
            <Link key={p.id} href={`/jobs/links?profile=${p.id}`} aria-current={profile?.id === p.id ? "page" : undefined} className={chipClass(profile?.id === p.id)}>
              {p.name}
            </Link>
          ))}
          <Link href="/jobs/profiles" className="text-sm text-primary underline-offset-2 hover:underline">
            {profiles.length === 0 ? "Create a profile" : "Manage profiles"}
          </Link>
        </nav>
        {profile && found && <ProfileMatches profileId={profile.id} profileName={profile.name} items={found.items} matching={found.matching} />}
        <SearchLinks
          key={profile?.id ?? "prefs"}
          initialRole={roles[0] ?? ""}
          initialLocation={locations[0] ?? ""}
          initialRemote={false}
          roleOptions={roles}
          locationOptions={locations}
          companies={careerDeepLinks.map((c) => ({ id: c.id, name: c.name, tierName: tierName.get(c.tier) ?? "", careersUrl: c.careersUrl, ...(c.searchTemplate ? { searchTemplate: c.searchTemplate } : {}) }))}
        />
      </div>
    </>
  );
}
