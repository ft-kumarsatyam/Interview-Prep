import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { BankFilters } from "@/modules/interview-bank/components/bank-filters";
import { BankList } from "@/modules/interview-bank/components/bank-list";
import { BankTools } from "@/modules/interview-bank/components/bank-tools";
import { bankFacets, CATEGORIES, LEVELS, SOURCES, filterBank, type BankFilter } from "@/modules/interview-bank/domain/bank";
import { listBank } from "@/modules/interview-bank/services/bank";
import { listTargets } from "@/modules/targets/services/targets";

export const metadata: Metadata = { title: "Interview bank" };

const PAGE = 40;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = <T extends string>(v: string, allowed: readonly T[]): T | undefined => (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

export default async function InterviewBankPage({ searchParams }: PageProps<"/interview-bank">) {
  const sp = await searchParams;
  const filter: BankFilter = {
    category: pick(one(sp.category), CATEGORIES),
    level: pick(one(sp.level), LEVELS),
    source: pick(one(sp.source), SOURCES),
    company: one(sp.company).slice(0, 60) || undefined,
    q: one(sp.q).slice(0, 80) || undefined,
  };
  const limit = Math.min(400, Math.max(PAGE, Number(one(sp.n)) || PAGE));
  const [all, targets] = await Promise.all([listBank(), listTargets()]);
  const facets = bankFacets(all, filter);
  const matching = filterBank(all, filter);
  const shown = matching.slice(0, limit);
  const companies = [...new Set([...targets.map((t) => t.name), ...all.flatMap((i) => (i.company ? [i.company] : []))])].toSorted((a, b) => a.localeCompare(b));
  const more = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "n" ? [[k, v] as [string, string]] : [])));
  more.set("n", String(limit + PAGE));

  return (
    <>
      <PageHeader
        icon={MessageCircleQuestion}
        title="Interview bank"
        description={`${all.length.toLocaleString()} questions in one place: DSA, system design, OOP and low-level design, databases, OS and networks, frontend, backend, AI and behavioural. Filter by topic, company and level, add your own, import the questions on a page you paste, or draft practice questions for a company.`}
      >
        <Button asChild variant="outline">
          <Link href="/web/interview">Flashcard practice</Link>
        </Button>
      </PageHeader>
      <div className="space-y-5">
        <BankTools companies={companies} />
        <BankFilters facets={facets} />
        <p className="text-xs text-muted-foreground" role="status">
          {matching.length.toLocaleString()} question{matching.length === 1 ? "" : "s"}
        </p>
        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing matches. Clear a filter, or add this question yourself above.</p>
        ) : (
          <BankList items={shown} />
        )}
        {matching.length > shown.length && (
          <Button asChild variant="outline">
            <Link href={`/interview-bank?${more.toString()}`} scroll={false}>
              Show {Math.min(PAGE, matching.length - shown.length)} more
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}
