import type { Metadata } from "next";
import { PracticeCaseList } from "@/modules/design/components/practice-case-list-section";

export const metadata: Metadata = { title: "Operating Systems" };

export default function Page() {
  return <PracticeCaseList kind="os" />;
}
