import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageStack } from "@/components/shared/page-stack";
import { FunShelf } from "@/modules/fun/components/fun-shelf";

export const metadata: Metadata = { title: "Break room" };

export default function FunPage() {
  return (
    <>
      <PageHeader title="Break room" icon={Sparkles} description="A small reset for your brain: puzzles, riddles and a joke before you return to the work." />
      <PageStack>
        <FunShelf />
      </PageStack>
    </>
  );
}
