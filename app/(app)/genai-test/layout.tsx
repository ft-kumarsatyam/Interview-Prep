import type { ReactNode } from "react";

export default function GenaiTestLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl space-y-6">{children}</div>;
}
