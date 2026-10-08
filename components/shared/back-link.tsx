import { ArrowLeft } from "lucide-react";
import { HistoryBackLink } from "@/components/shared/history-back-link";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <HistoryBackLink
      href={href}
      className="-ml-2 mb-3 inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11"
    >
      <ArrowLeft className="size-4" aria-hidden /> {children}
    </HistoryBackLink>
  );
}
