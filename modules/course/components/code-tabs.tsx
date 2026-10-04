"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANG_LABEL, type COURSE_LANGS } from "@/modules/course/domain/course";

type Lang = (typeof COURSE_LANGS)[number];

const PREF_KEY = "prepos:course:lang";

function savedLang(): Lang | null {
  try {
    return (localStorage.getItem(PREF_KEY) as Lang | null) ?? null;
  } catch {
    return null;
  }
}

/** The same solution in several languages. The language you pick is remembered across lessons. */
export function CodeTabs({ code }: { code: Array<{ lang: Lang; source: string }> }) {
  const [lang, setLang] = useState<Lang | null>(null);
  const [copied, setCopied] = useState(false);
  const wanted = lang ?? savedLang();
  const active = code.find((c) => c.lang === wanted) ?? code[0];
  if (!active) return null;

  const pick = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem(PREF_KEY, l);
    } catch {
      /* storage blocked: the pick still works for this view */
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(active.source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-2 py-1.5">
        <div role="tablist" aria-label="Language" className="flex flex-wrap gap-1">
          {code.map((c) => (
            <button
              key={c.lang}
              type="button"
              role="tab"
              aria-selected={c.lang === active.lang}
              onClick={() => pick(c.lang)}
              className={`min-h-8 rounded-md px-2.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-10 ${c.lang === active.lang ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {LANG_LABEL[c.lang]}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={copy} aria-label="Copy code">
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code>{active.source}</code>
      </pre>
    </div>
  );
}
