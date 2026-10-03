"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Bot, CalendarDays, CalendarOff, Clock, Code2, Database, Gauge, Newspaper, Sparkles, Timer, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SettingsSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const SETTINGS_GROUPS: Array<{ label: string; sections: SettingsSection[] }> = [
  {
    label: "Plan",
    sections: [
      { id: "plan", label: "Plan and targets", icon: CalendarDays },
      { id: "hours", label: "Study hours", icon: Clock },
      { id: "quiz", label: "Quiz and mastery", icon: Gauge },
      { id: "mocks", label: "Weekly mocks", icon: Timer },
      { id: "rest-days", label: "Rest days", icon: CalendarOff },
    ],
  },
  {
    label: "Integrations",
    sections: [
      { id: "leetcode", label: "LeetCode", icon: Code2 },
      { id: "news", label: "News keywords", icon: Newspaper },
      { id: "gemini-links", label: "Gemini projects", icon: Sparkles },
      { id: "paid-ai", label: "Paid AI fallback", icon: Wallet },
      { id: "ai", label: "AI providers", icon: Bot },
    ],
  },
  {
    label: "System",
    sections: [
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "data", label: "Data and backup", icon: Database },
    ],
  },
];

const ALL = SETTINGS_GROUPS.flatMap((g) => g.sections);

/** Sticky side list on desktop, a sticky scrollable chip strip on mobile. Highlights the section in view. */
export function SettingsNav() {
  const [active, setActive] = useState(ALL[0].id);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = ALL.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    const visible = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = ALL.find((s) => visible.get(s.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-128px 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    const box = strip.current;
    if (!el || !box || box.scrollWidth <= box.clientWidth) return;
    box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
  }, [active]);

  const go = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  };

  return (
    <>
      <nav aria-label="Settings sections" className="sticky top-14 z-20 -mx-4 mb-4 border-b bg-background/90 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:hidden">
        <div ref={strip} className="scrollbar-none flex gap-2 overflow-x-auto scroll-smooth motion-reduce:scroll-auto">
          {ALL.map((s) => (
            <a
              key={s.id}
              data-id={s.id}
              href={`#${s.id}`}
              onClick={go(s.id)}
              aria-current={active === s.id ? "location" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                active === s.id && "border-primary bg-primary/10 font-medium text-primary",
              )}
            >
              <s.icon className="size-3.5" aria-hidden />
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <aside className="hidden lg:block">
        <nav aria-label="Settings sections" className="sticky top-20 max-h-[calc(100dvh-6rem)] space-y-5 overflow-y-auto pb-4">
          {SETTINGS_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{g.label}</p>
              <ul className="space-y-0.5">
                {g.sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={go(s.id)}
                      aria-current={active === s.id ? "location" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        active === s.id && "bg-primary/10 font-medium text-primary hover:bg-primary/15 hover:text-primary",
                      )}
                    >
                      <s.icon className="size-4 shrink-0" aria-hidden />
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
