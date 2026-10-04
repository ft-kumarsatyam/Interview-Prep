import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, ListChecks, RotateCcw } from "lucide-react";
import { chipClass } from "@/components/shared/chip";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { PracticeEntryCard } from "@/modules/practice/components/entry-card";
import { filterCatalog, KIND_LABEL, KINDS, recommend, STATUS_LABEL, STATUSES, SUBJECT_NAME, SUBJECTS, subjectCounts, type EntryStatus, type PracticeKind, type SubjectId } from "@/modules/practice/domain/catalog";
import { getPracticeCatalog } from "@/modules/practice/services/catalog";

export const metadata: Metadata = { title: "Practice" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function PracticePage({ searchParams }: PageProps<"/practice">) {
  const sp = await searchParams;
  const { entries, studiedTopics } = await getPracticeCatalog();

  const subject = SUBJECTS.find((s) => s.id === one(sp.subject))?.id as SubjectId | undefined;
  const kind = KINDS.find((k) => k === one(sp.kind)) as PracticeKind | undefined;
  const status = STATUSES.find((s) => s === one(sp.status)) as EntryStatus | undefined;
  const mine = one(sp.mine) === "1";
  const filtered = !!(subject || kind || status || mine);

  const href = (next: { subject?: string | null; kind?: string | null; status?: string | null; mine?: boolean }) => {
    const q = new URLSearchParams();
    const s = next.subject === undefined ? subject : next.subject;
    const k = next.kind === undefined ? kind : next.kind;
    const st = next.status === undefined ? status : next.status;
    const m = next.mine === undefined ? mine : next.mine;
    if (s) q.set("subject", s);
    if (k) q.set("kind", k);
    if (st) q.set("status", st);
    if (m) q.set("mine", "1");
    const qs = q.toString();
    return qs ? `/practice?${qs}` : "/practice";
  };

  const shown = filterCatalog(entries, { subject, kind, status, studiedOnly: mine }, studiedTopics);
  const counts = subjectCounts(entries);
  const picks = filtered ? [] : recommend(entries, studiedTopics, 4);
  const bySubject = SUBJECTS.map((s) => ({ s, items: shown.filter((e) => e.subject === s.id) })).filter((g) => g.items.length > 0);
  const mastered = entries.filter((e) => e.status === "mastered").length;

  return (
    <>
      <PageHeader icon={Dumbbell} title="Practice" description={`Everything you can practise in one place: ${entries.length} quiz sets, cases, code sets and flashcards across ${counts.size} subjects. ${mastered} mastered so far.`}>
        <Button asChild>
          <Link href="/practice/quiz">
            <ListChecks /> Custom quiz
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/quiz/mistakes">
            <RotateCcw /> Fix mistakes
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/problems">My code problems</Link>
        </Button>
      </PageHeader>

      {picks.length > 0 && (
        <section aria-label="Suggested next" className="mb-6 space-y-2">
          <SectionHeading title="Suggested next" hint={studiedTopics.size > 0 ? "Topics you have studied but not mastered come first." : "Study a topic, then practise it here."} />
          <ul className="grid gap-2 md:grid-cols-2">
            {picks.map((e) => (
              <PracticeEntryCard key={e.id} entry={e} />
            ))}
          </ul>
        </section>
      )}

      <div className="mb-5 space-y-3">
        <div role="group" aria-label="Subject" className="flex flex-wrap gap-1.5">
          <Link href={href({ subject: null })} className={chipClass(!subject)} aria-current={!subject ? "true" : undefined}>
            All subjects
          </Link>
          {SUBJECTS.filter((s) => counts.has(s.id)).map((s) => (
            <Link key={s.id} href={href({ subject: s.id })} className={chipClass(subject === s.id)} aria-current={subject === s.id ? "true" : undefined}>
              {s.name} <span className="text-muted-foreground">{counts.get(s.id)}</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div role="group" aria-label="Kind" className="flex flex-wrap gap-1.5">
            <Link href={href({ kind: null })} className={chipClass(!kind)}>
              All kinds
            </Link>
            {KINDS.map((k) => (
              <Link key={k} href={href({ kind: k })} className={chipClass(kind === k)} aria-current={kind === k ? "true" : undefined}>
                {KIND_LABEL[k]}
              </Link>
            ))}
          </div>
          <div role="group" aria-label="Status" className="flex flex-wrap gap-1.5">
            <Link href={href({ status: null })} className={chipClass(!status)}>
              Any status
            </Link>
            {STATUSES.map((s) => (
              <Link key={s} href={href({ status: s })} className={chipClass(status === s)} aria-current={status === s ? "true" : undefined}>
                {STATUS_LABEL[s]}
              </Link>
            ))}
          </div>
          <Link href={href({ mine: !mine })} className={chipClass(mine)} aria-pressed={mine}>
            Only what I have studied
          </Link>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {mine && studiedTopics.size === 0 ? "You have not studied anything yet. Tick a subtopic on the Learn page or finish a course lesson, then it shows up here." : "Nothing matches those filters."}{" "}
          {filtered && (
            <Link href="/practice" className="text-primary underline-offset-2 hover:underline">
              Clear filters
            </Link>
          )}
        </p>
      ) : (
        <div className="space-y-6">
          {bySubject.map(({ s, items }) => (
            <section key={s.id} aria-label={SUBJECT_NAME[s.id]} className="space-y-2">
              <SectionHeading title={`${SUBJECT_NAME[s.id]} (${items.length})`} />
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {items.map((e) => (
                  <PracticeEntryCard key={e.id} entry={e} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
