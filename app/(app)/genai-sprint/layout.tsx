import type { ReactNode } from "react";
import { SprintSubnav } from "@/modules/genai-sprint/components/sprint-subnav";

export default function GenaiSprintLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SprintSubnav />
      {children}
    </div>
  );
}
