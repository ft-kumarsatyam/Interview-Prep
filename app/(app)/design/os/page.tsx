import type { Metadata } from "next";
import { PracticeCaseList } from "@/components/design/practice-case-list";

export const metadata: Metadata = { title: "Operating Systems" };

export default function Page() {
  return <PracticeCaseList kind="os" />;
}
