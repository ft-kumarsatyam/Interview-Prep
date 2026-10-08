import type { Metadata } from "next";
import { Database } from "lucide-react";
import { DbLab } from "@/modules/dsa/components/db-lab/db-lab";
import { DB_CHALLENGES } from "@/modules/dsa/domain/db-lab";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "DB Lab" };

export default async function DbLabPage({ searchParams }: PageProps<"/playground/db">) {
  const { challenge } = await searchParams;
  return (
    <>
      <PageHeader
        icon={Database}
        title="DB Lab"
        description={`${DB_CHALLENGES.length} challenges in real SQL (SQLite, with MySQL helpers) and MongoDB-style queries, grouped by topic from easy to hard, each on seeded data. Run, then check against the expected rows. Everything runs on your device.`}
      />
      <DbLab initialChallenge={typeof challenge === "string" ? challenge.slice(0, 80) : undefined} />
    </>
  );
}
