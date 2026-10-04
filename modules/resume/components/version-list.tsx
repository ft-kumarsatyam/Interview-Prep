"use client";

import { useTransition } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteVersionAction } from "@/app/(app)/resume/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface VersionRow {
  id: string;
  label: string;
  company: string;
  role: string;
  updatedAt: string;
  score: number | null;
}

/** The saved resumes (the base plus each tailored version) with downloads. */
export function VersionList({ baseId, versions, profiles = [] }: { baseId: string | null; versions: VersionRow[]; profiles?: Array<{ id: string; label: string; updatedAt: string }> }) {
  const [pending, start] = useTransition();
  const remove = (id: string) =>
    start(async () => {
      const res = await deleteVersionAction({ id });
      if (!res.ok) toast.error(`${res.error}.`);
      else toast.success("Version deleted");
    });

  const links = (id: string) => (
    <span className="flex gap-1">
      {(["pdf", "docx", "txt"] as const).map((f) => (
        <Button key={f} variant="outline" size="sm" asChild>
          <a href={`/api/resume/${id}/download?format=${f}`} aria-label={`Download ${f.toUpperCase()}`}>
            <Download /> {f.toUpperCase()}
          </a>
        </Button>
      ))}
    </span>
  );

  if (!baseId && versions.length === 0 && profiles.length === 0) return null;
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Saved resumes</CardTitle>
        <CardDescription>Your base resume and the versions tailored to each job. Downloads are single-column, text-based files an ATS can read.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {baseId && (
            <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="text-sm font-medium">Base resume</span>
              {links(baseId)}
            </li>
          )}
          {versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="min-w-0 text-sm">
                <span className="font-medium">{v.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{new Date(v.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </span>
              <span className="flex items-center gap-1">
                {links(v.id)}
                <Button variant="ghost" size="icon" onClick={() => remove(v.id)} disabled={pending} aria-label={`Delete ${v.label}`}>
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
          {profiles.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="min-w-0 text-sm">
                <span className="font-medium">{p.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">snapshot {new Date(p.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </span>
              <span className="flex items-center gap-1">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/resume?r=${p.id}`}>Audit</a>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(p.id)} disabled={pending} aria-label={`Delete ${p.label}`}>
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
