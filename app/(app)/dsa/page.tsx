import type { Metadata } from "next";
import { DsaBrowser } from "@/components/dsa/dsa-browser";
import { PageHeader } from "@/components/shared/page-header";
import { problems } from "@/lib/content";
import { getProgressMap } from "@/lib/services/problems";

export const metadata: Metadata = { title: "DSA" };

export default async function DsaPage() {
  const progress = await getProgressMap();
  return (
    <>
      <PageHeader title="DSA" description={`${problems.length} free LeetCode problems, solved in JavaScript.`} />
      <DsaBrowser problems={problems} progress={progress} />
    </>
  );
}
