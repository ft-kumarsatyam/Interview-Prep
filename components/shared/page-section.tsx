import type { ReactNode } from "react";
import { SectionHeading } from "@/components/shared/section-heading";

/** A page section with an eyebrow heading. Put it inside `PageStack`, which spaces sections apart. */
export function PageSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <SectionHeading eyebrow className="mb-0" title={title} />
      {children}
    </section>
  );
}
