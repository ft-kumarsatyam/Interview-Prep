import type { Metadata } from "next";
import { PracticeCaseList } from "@/modules/design/components/practice-case-list-section";

export const metadata: Metadata = { title: "AI Systems" };

export default function Page() {
  return <PracticeCaseList kind="ai" />;
}
