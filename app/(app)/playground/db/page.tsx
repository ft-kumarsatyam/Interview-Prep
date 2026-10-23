import type { Metadata } from "next";
import { Database } from "lucide-react";
import { DbLab } from "@/modules/dsa/components/db-lab/db-lab";
import { DB_CHALLENGES } from "@/modules/dsa/domain/db-lab";
import { listSavedQueries, listSolved } from "@/modules/dsa/services/code-lab";
// The page composes the two modules: DB Lab draws its ER diagram with the design module's Mermaid renderer.
import { MermaidDiagram } from "@/modules/design/components/mermaid-diagram";
import { PageHeader } from "@/components/shared/page-header";
import { requireSession } from "@/core/auth/dal";

export const metadata: Metadata = { title: "DB Lab" };

export default async function DbLabPage({ searchParams }: PageProps<"/playground/db">) {
  await requireSession();
  const { challenge } = await searchParams;
  const [saved, solved] = await Promise.all([listSavedQueries(), listSolved()]);
  return (
    <>
      <PageHeader
        icon={Database}
        title="DB Lab"
        description={`${DB_CHALLENGES.length} challenges in real SQL (SQLite or PostgreSQL, with MySQL helpers on SQLite) and MongoDB-style queries, grouped by topic from easy to hard, each on seeded data. Run, check against the expected rows, read the query plan, and save queries to your account. Queries run on your device.`}
      />
      <DbLab
        initialChallenge={typeof challenge === "string" ? challenge.slice(0, 80) : undefined}
        savedQueries={saved.map(({ id, title, sql, mode, dataset, updatedAt }) => ({ id, title, sql, mode, dataset, updatedAt }))}
        solved={solved.map(({ challengeId, mode }) => ({ challengeId, mode }))}
        ErDiagram={MermaidDiagram}
      />
    </>
  );
}
