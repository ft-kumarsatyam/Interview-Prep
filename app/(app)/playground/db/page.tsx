import type { Metadata } from "next";
import { Database } from "lucide-react";
import { DbLab } from "@/modules/dsa/components/db-lab/db-lab";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "DB Lab" };

export default function DbLabPage() {
  return (
    <>
      <PageHeader
        icon={Database}
        title="DB Lab"
        description="Real SQL (SQLite, with MySQL helpers) and MongoDB-style queries against seeded data. Pick a challenge, run, then check it against the expected rows. Everything runs on your device."
      />
      <DbLab />
    </>
  );
}
