import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { CompanyGrid } from "@/modules/dsa/components/company-grid";
import { topCompanies } from "@/modules/dsa/domain/company-tags";
import { companyDataset } from "@/core/content";

export const metadata: Metadata = { title: "Company-wise DSA" };

export default function CompaniesPage() {
  const { source } = companyDataset;
  const india = companyDataset.companies.filter((c) => c.region === "india").length;
  return (
    <>
      <BackLink href="/dsa">DSA</BackLink>
      <PageHeader
        icon={Building2}
        title="Company-wise DSA"
        description={`${companyDataset.companies.length} companies (${india} Indian) and ${Object.keys(companyDataset.questions).length.toLocaleString()} LeetCode questions, with how often each was asked in the last 30 days, 3 months and 6 months.`}
      />
      <CompanyGrid companies={topCompanies(companyDataset)} />
      <p className="mt-6 text-xs text-muted-foreground">
        Tags from{" "}
        <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
          {source.name}
        </a>{" "}
        (snapshot {source.datasetDate}). {source.note}
      </p>
    </>
  );
}
