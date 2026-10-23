import type { ReactNode } from "react";
import { PlaybookSubnav } from "@/modules/genai-playbook/components/playbook-subnav";

export default function GenaiPlaybookLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PlaybookSubnav />
      {children}
    </div>
  );
}
