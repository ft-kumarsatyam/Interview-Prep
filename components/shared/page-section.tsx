import type { ReactNode } from "react";
import { SectionHeading } from "@/components/shared/section-heading";

/** A page section with an eyebrow heading and consistent spacing. */
export function PageSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-3">
      <SectionHeading eyebrow className="mb-0" title={title} />
      {children}
    </section>
  );
}
