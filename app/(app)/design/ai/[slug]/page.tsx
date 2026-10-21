import type { Metadata } from "next";
import { PracticeCaseDetail } from "@/modules/design/components/practice-case-detail-section";
import { practiceCaseBySlug } from "@/core/content";

export async function generateMetadata({ params }: PageProps<"/design/ai/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: practiceCaseBySlug.get(`ai:${slug}`)?.title ?? "AI Systems" };
}

export default async function Page({ params, searchParams }: PageProps<"/design/ai/[slug]">) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  return <PracticeCaseDetail kind="ai" slug={slug} tab={tab === "practice" ? "practice" : "study"} />;
}
