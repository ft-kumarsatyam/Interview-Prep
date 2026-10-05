import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ArticleMarkdown } from "@/modules/news/components/article-markdown";
import { OwnItemControls } from "@/modules/interview-bank/components/own-item-controls";
import { CATEGORY_LABEL, SOURCE_LABEL, type BankItem } from "@/modules/interview-bank/domain/bank";

/** The filtered questions. Each opens to its answer; yours can be edited or removed. */
export function BankList({ items }: { items: BankItem[] }) {
  return (
    <ul className="space-y-2" aria-label="Interview questions">
      {items.map((i) => (
        <li key={i.id} className="rounded-xl border bg-card">
          <details className="group">
            <summary className="cursor-pointer list-none px-4 py-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <span className="block text-sm font-medium break-words">{i.question}</span>
              <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span>{CATEGORY_LABEL[i.category]}</span>
                {i.company && <span>· {i.company}</span>}
                {i.level && <span>· {i.level}</span>}
                {i.round && <span>· {i.round}</span>}
                <span>· {SOURCE_LABEL[i.source]}</span>
              </span>
            </summary>
            <div className="space-y-3 border-t px-4 py-3 text-sm">
              {i.source === "ai" && <p className="rounded-md bg-warning/10 px-2.5 py-1.5 text-xs text-warning">AI-drafted in this company&apos;s style. It is practice material, not a record of a question they asked, so check the answer.</p>}
              {i.answer ? <ArticleMarkdown markdown={i.answer} /> : <p className="text-muted-foreground">No written answer here. Work it out, then open the practice page.</p>}
              {i.tags.length > 0 && <p className="text-xs text-muted-foreground">{i.tags.map((t) => `#${t}`).join("  ")}</p>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                {i.href && (
                  <Link href={i.href} className="text-primary underline-offset-2 hover:underline">
                    Practise this
                  </Link>
                )}
                {i.sourceUrl && (
                  <a href={i.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                    <ExternalLink className="size-3" aria-hidden /> Source page<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
                {i.source !== "seed" && <OwnItemControls item={i} />}
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
