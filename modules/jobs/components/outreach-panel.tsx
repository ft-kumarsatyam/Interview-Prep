"use client";

import { useState, useTransition } from "react";
import { Mail, Send, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { draftEmailAction, sendEmailAction } from "@/app/(app)/jobs/outreach-actions";
import { Button } from "@/components/ui/button";
import { mailtoUrl } from "@/modules/jobs/domain/recruiter-email";
import type { OutreachRecord } from "@/modules/jobs/services/outreach";

type Target = { kind: "posting"; id: string } | { kind: "job"; id: string };

const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/**
 * Email a recruiter about this job. The model drafts it from your resume, you read and edit it, and either open it in
 * your own mail app or send it from here after ticking the confirmation. Nothing is ever sent automatically.
 */
export function OutreachPanel({ target, hasResume, sent }: { target: Target; hasResume: boolean; sent: OutreachRecord[] }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [history, setHistory] = useState(sent);
  const [pending, start] = useTransition();
  const drafted = body.length > 0;

  const draft = () =>
    start(async () => {
      const res = await draftEmailAction({ target });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setSubject(res.draft.subject);
      setBody(res.draft.body);
      setWarnings(res.warnings);
      setConfirm(false);
    });

  const send = () =>
    start(async () => {
      const res = await sendEmailAction({ target, email: { to, subject, body }, confirm });
      if (!res.ok) return void toast.error(`${res.error}.`);
      toast.success(`Sent to ${to}. It is recorded on the job.`);
      setHistory((h) => [{ to, subject, at: new Date().toISOString() }, ...h]);
      setConfirm(false);
    });

  const canSend = drafted && to.includes("@") && subject.trim().length >= 3 && body.trim().length >= 20 && confirm && !pending;

  return (
    <section aria-label="Email the recruiter" className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Mail className="size-4" aria-hidden /> Email the recruiter
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">The draft uses only what is on your resume. You review it first; nothing is sent until you tick the box and press Send.</p>
      </div>

      {!hasResume ? (
        <p className="text-sm text-muted-foreground">Save your resume first, then PrepOS can draft the email from it.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            <label htmlFor="rc-to" className="text-xs font-medium">
              Recruiter&apos;s email
            </label>
            <input id="rc-to" type="email" inputMode="email" autoComplete="off" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com" className={field} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={draft} disabled={pending}>
            <Sparkles aria-hidden /> {drafted ? "Draft again" : "Draft with AI"}
          </Button>

          {drafted && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="rc-subject" className="text-xs font-medium">
                  Subject
                </label>
                <input id="rc-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} className={field} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="rc-body" className="text-xs font-medium">
                  Message
                </label>
                <textarea id="rc-body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} maxLength={6000} className={field} />
              </div>
              {warnings.length > 0 && (
                <ul className="space-y-1 rounded-lg bg-warning/10 p-3 text-xs text-warning" aria-label="Things to check">
                  {warnings.map((w) => (
                    <li key={w} className="flex gap-1.5">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {w}
                    </li>
                  ))}
                </ul>
              )}
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1" />
                <span>I have read this email and want it sent to {to || "the address above"}.</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={send} disabled={!canSend}>
                  <Send aria-hidden /> Send from PrepOS
                </Button>
                <Button asChild type="button" size="sm" variant="outline">
                  <a href={to.includes("@") ? mailtoUrl(to, subject, body) : undefined} aria-disabled={!to.includes("@")}>
                    Open in my mail app
                  </a>
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {history.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">Already sent</h3>
          <ul className="space-y-0.5 text-sm">
            {history.map((h) => (
              <li key={`${h.to}-${h.at}`}>
                {h.to} <span className="text-xs text-muted-foreground">· {h.subject} · {new Date(h.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
