import type { Metadata } from "next";
import { PracticeCaseDetail } from "@/components/design/practice-case-detail";
import { practiceCaseBySlug } from "@/lib/content";

export async function generateMetadata({ params }: PageProps<"/design/dbms/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: practiceCaseBySlug.get(`dbms:${slug}`)?.title ?? "Databases" };
}

export default async function Page({ params, searchParams }: PageProps<"/design/dbms/[slug]">) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  return <PracticeCaseDetail kind="dbms" slug={slug} tab={tab === "practice" ? "practice" : "study"} />;
}
