import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { chipClass } from "@/components/shared/chip";
import { PageHeader } from "@/components/shared/page-header";
import { CompanyQuestionTable, type CompanyQuestionRow } from "@/modules/dsa/components/company-question-table";
import { COMPANY_WINDOW_LABEL, COMPANY_WINDOWS, companyQuestions, localSlugByLeetcode, type CompanyWindow } from "@/modules/dsa/domain/company-tags";
import { companyDataset, problems } from "@/core/content";
import { getProgressMap } from "@/modules/dsa/services/problems";

const localSlugs = localSlugByLeetcode(problems);

function parseWindow(value: string | string[] | undefined): CompanyWindow {
  return COMPANY_WINDOWS.find((w) => w === value) ?? "all";
}

export async function generateMetadata({ params }: PageProps<"/dsa/companies/[company]">): Promise<Metadata> {
  const { company } = await params;
  const found = companyDataset.companies.find((c) => c.slug === company);
  return { title: found ? `${found.name} DSA questions` : "Company" };
}

export default async function CompanyPage({ params, searchParams }: PageProps<"/dsa/companies/[company]">) {
  const [{ company: slug }, sp] = await Promise.all([params, searchParams]);
  const company = companyDataset.companies.find((c) => c.slug === slug);
  if (!company) notFound();
  const span = parseWindow(sp.w);
  const progress = await getProgressMap();

  const rows: CompanyQuestionRow[] = companyQuestions(companyDataset, company.slug, span).map((q) => {
    const localSlug = localSlugs.get(q.leetcodeSlug);
    return localSlug ? { ...q, localSlug } : q;
  });
  const solved = rows.flatMap((r) => (r.localSlug && progress[r.localSlug]?.status === "solved" ? [r.localSlug] : []));
  const topicCounts = new Map<string, number>();
  for (const row of rows) for (const t of row.topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  const topics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 30).map(([t]) => t);
  const inApp = rows.filter((r) => r.localSlug).length;
  const { source } = companyDataset;

  return (
    <>
      <BackLink href="/dsa/companies">Companies</BackLink>
      <PageHeader
        icon={Building2}
        title={company.name}
        description={`${rows.length} questions asked ${span === "all" ? "overall" : `in the last ${COMPANY_WINDOW_LABEL[span]}`}${rows.length ? `, ${solved.length} solved, ${inApp} open in the PrepOS IDE` : ""}.${company.region === "india" ? " Indian company." : ""}`}
      />
      <nav aria-label="Time window" className="mb-4 flex gap-2 overflow-x-auto">
        {COMPANY_WINDOWS.map((w, i) => (
          <Link
            key={w}
            href={w === "all" ? `/dsa/companies/${company.slug}` : `/dsa/companies/${company.slug}?w=${w}`}
            aria-current={w === span ? "page" : undefined}
            className={chipClass(w === span)}
            scroll={false}
          >
            {COMPANY_WINDOW_LABEL[w]}
            <span className="tabular font-mono text-2xs opacity-80">{company.counts[i]}</span>
          </Link>
        ))}
      </nav>
      <CompanyQuestionTable key={span} rows={rows} solved={solved} topics={topics} />
      <p className="mt-6 text-xs text-muted-foreground">
        Frequencies from{" "}
        <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
          {source.name}
        </a>{" "}
        (snapshot {source.datasetDate}). {source.note} Questions not in PrepOS open on LeetCode.
      </p>
    </>
  );
}
