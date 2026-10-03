import type { Metadata } from "next";
import { Database } from "lucide-react";
import { DbLab } from "@/components/db-lab/db-lab";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "DB Lab" };

export default function DbLabPage() {
  return (
    <>
      <PageHeader
        icon={Database}
        title="DB Lab"
        description="Write real SQL (SQLite in your browser) or MongoDB-style queries against seeded data, then check your answer against a reference. Nothing leaves your device."
      />
      <DbLab />
    </>
  );
}
