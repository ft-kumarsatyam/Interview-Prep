import type { Metadata } from "next";
import { PracticeCaseDetail } from "@/components/design/practice-case-detail";
import { practiceCaseBySlug } from "@/lib/content";

export async function generateMetadata({ params }: PageProps<"/design/os/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: practiceCaseBySlug.get(`os:${slug}`)?.title ?? "Operating Systems" };
}

export default async function Page({ params, searchParams }: PageProps<"/design/os/[slug]">) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  return <PracticeCaseDetail kind="os" slug={slug} tab={tab === "practice" ? "practice" : "study"} />;
}
