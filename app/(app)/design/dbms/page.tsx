import type { Metadata } from "next";
import { PracticeCaseList } from "@/modules/design/components/practice-case-list-section";

export const metadata: Metadata = { title: "Databases" };

export default function Page() {
  return <PracticeCaseList kind="dbms" />;
}
