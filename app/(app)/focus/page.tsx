import type { Metadata } from "next";
import { Clock3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageStack } from "@/components/shared/page-stack";
import { FocusHistory } from "@/modules/progress/components/focus-history";

export const metadata: Metadata = { title: "Focus history" };

export default function FocusPage() {
  return (
    <>
      <PageHeader title="Focus history" icon={Clock3} description="See how long you studied, what you logged, and which areas you visited." />
      <PageStack>
        <FocusHistory />
      </PageStack>
    </>
  );
}
