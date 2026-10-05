"use client";

import { useState, useTransition } from "react";
import { Download, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { addQuestionAction, draftForCompanyAction, previewImportAction, saveImportedAction } from "@/app/(app)/interview-bank/actions";
import { Chip } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuestionForm } from "@/modules/interview-bank/components/question-form";
import { CATEGORIES, CATEGORY_LABEL, type Candidate, type Category } from "@/modules/interview-bank/domain/bank";

type Tool = "add" | "import" | "draft";

/** Three ways to grow the bank: write a question, import the questions on a page you paste, or draft practice questions for a company. */
export function BankTools({ companies }: { companies: string[] }) {
  const [tool, setTool] = useState<Tool | null>(null);
  const toggle = (t: Tool) => setTool((cur) => (cur === t ? null : t));
  return (
    <section aria-label="Add questions" className="space-y-3">
      <div role="group" aria-label="Add questions" className="flex flex-wrap gap-1.5">
        <Chip pressed={tool === "add"} onClick={() => toggle("add")}>
          <Plus className="size-3.5" aria-hidden /> Add my own
        </Chip>
        <Chip pressed={tool === "import"} onClick={() => toggle("import")}>
          <Download className="size-3.5" aria-hidden /> Import from a web page
        </Chip>
        <Chip pressed={tool === "draft"} onClick={() => toggle("draft")}>
          <Sparkles className="size-3.5" aria-hidden /> Draft for a company
        </Chip>
      </div>
      {tool === "add" && (
        <QuestionForm
          submitLabel="Add question"
          companies={companies}
          onSubmit={async (q) => {
            const res = await addQuestionAction(q);
            if (!res.ok) return void toast.error(`${res.error}.`);
            toast.success("Added to your bank");
          }}
        />
      )}
      {tool === "import" && <ImportPanel companies={companies} />}
      {tool === "draft" && <DraftPanel companies={companies} />}
    </section>
  );
}

function ImportPanel({ companies }: { companies: string[] }) {
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [found, setFound] = useState<{ url: string; candidates: Candidate[] } | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();

  const read = () =>
    start(async () => {
      const res = await previewImportAction({ url, company });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setFound({ url: res.url, candidates: res.candidates });
      setPicked(new Set(res.candidates.flatMap((c, i) => (c.duplicate ? [] : [i]))));
    });
  const save = () =>
    start(async () => {
      if (!found) return;
      const items = found.candidates.filter((_, i) => picked.has(i)).map((c) => ({ question: c.question, answer: c.answer, category: c.category, level: c.level, company: c.company, round: c.round }));
      const res = await saveImportedAction({ url: found.url, items });
      if (!res.ok) return void toast.error(`${res.error}.`);
      toast.success(`Added ${res.added}${res.skipped ? `, skipped ${res.skipped} already there` : ""}`);
      setFound(null);
      setUrl("");
    });

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <p className="text-sm text-muted-foreground">
        Paste the address of a public page that lists interview questions (a blog post, an experience write-up, a company prep page). PrepOS reads that one page, drafts the questions on it and shows them to you. Nothing is saved until you tick questions and confirm. Sites that need a login, such as LinkedIn or Glassdoor, are not read.
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="space-y-1.5">
          <Label htmlFor="imp-url">Page address</Label>
          <Input id="imp-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" maxLength={2000} inputMode="url" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="imp-company">Company (optional)</Label>
          <Input id="imp-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={60} list="imp-companies" />
          <datalist id="imp-companies">
            {companies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>
      <Button type="button" onClick={read} disabled={pending || url.trim().length < 8} loading={pending && !found}>
        Read the page
      </Button>
      {found && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Found {found.candidates.length} on that page. Untick any you don&apos;t want.
          </p>
          <ul className="space-y-1.5">
            {found.candidates.map((c, i) => (
              <li key={`${i}-${c.question}`} className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
                <input
                  id={`cand-${i}`}
                  type="checkbox"
                  checked={picked.has(i)}
                  onChange={(e) =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(i);
                      else next.delete(i);
                      return next;
                    })
                  }
                  className="mt-1 size-4"
                />
                <label htmlFor={`cand-${i}`} className="min-w-0 flex-1">
                  <span className="block break-words">{c.question}</span>
                  <span className="block text-xs text-muted-foreground">
                    {CATEGORY_LABEL[c.category]}
                    {c.company ? ` · ${c.company}` : ""}
                    {c.level ? ` · ${c.level}` : ""}
                    {c.duplicate ? " · already in your bank" : ""}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button type="button" onClick={save} disabled={pending || picked.size === 0}>
              Save {picked.size} question{picked.size === 1 ? "" : "s"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setFound(null)}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftPanel({ companies }: { companies: string[] }) {
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState<Category>("dsa");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <p className="text-sm text-muted-foreground">
        A free AI model drafts practice questions in a company&apos;s style for one topic. They are labelled <strong>AI-drafted</strong> because they are practice material from what is publicly known about the company&apos;s rounds, not a list of questions the company really asked. Check the answers.
      </p>
      <div className="space-y-1.5 sm:max-w-xs">
        <Label htmlFor="dr-company">Company</Label>
        <Input id="dr-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={60} list="dr-companies" placeholder="Amazon" />
        <datalist id="dr-companies">
          {companies.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div role="group" aria-label="Topic" className="flex flex-wrap gap-1.5">
        {CATEGORIES.filter((c) => c !== "other").map((c) => (
          <Chip key={c} pressed={category === c} onClick={() => setCategory(c)}>
            {CATEGORY_LABEL[c]}
          </Chip>
        ))}
      </div>
      <Button
        type="button"
        disabled={pending || company.trim().length < 2}
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await draftForCompanyAction({ company, category, count: 5 });
            if (!res.ok) return void toast.error(`${res.error}.`);
            toast.success(`Drafted ${res.added} question${res.added === 1 ? "" : "s"}`);
          })
        }
      >
        Draft 5 questions
      </Button>
    </div>
  );
}
