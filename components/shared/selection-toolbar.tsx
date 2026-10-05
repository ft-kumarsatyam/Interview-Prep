"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { BookOpen, Copy, Highlighter, LoaderCircle, Sparkles, StickyNote, X } from "lucide-react";
import { toast } from "sonner";
import { createCapturedNoteAction } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils";
import { NOTE_COLORS, type NoteColor } from "@/modules/notes/domain/notes";

type SelectionInfo = {
  text: string;
  href: string;
  title: string;
  kind: "lesson" | "article" | "course" | "problem" | "design" | "interview" | "other";
  heading: string;
  x: number;
  y: number;
};

type AiState = { text: string; pending: boolean; action: "explain" | "flashcard" } | null;
const COLOR_CLASS: Record<NoteColor, string> = {
  yellow: "bg-yellow-300",
  blue: "bg-blue-300",
  green: "bg-green-300",
  pink: "bg-pink-300",
  purple: "bg-purple-300",
};

function markClass(color: NoteColor): string {
  return `${COLOR_CLASS[color]} rounded-sm px-0.5 text-foreground`;
}

function textNodesInMain(): Text[] {
  const main = document.querySelector("main");
  if (!main) return [];
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node as Text;
    if (!text.data || text.parentElement?.closest("[data-selection-toolbar], mark, input, textarea, button, [data-no-selection-toolbar]")) continue;
    nodes.push(text);
  }
  return nodes;
}

function normalizedRange(excerpt: string, nodes: Text[]): Range | null {
  const wanted = excerpt.trim().replace(/\s+/g, " ");
  if (!wanted) return null;
  let normalized = "";
  const positions: Array<{ node: Text; offset: number }> = [];
  let pendingSpace: { node: Text; offset: number } | null = null;
  for (const node of nodes) {
    for (let offset = 0; offset < node.data.length; offset += 1) {
      const char = node.data[offset]!;
      if (/\s/.test(char)) {
        pendingSpace ??= { node, offset };
        continue;
      }
      if (pendingSpace && normalized) {
        normalized += " ";
        positions.push(pendingSpace);
      }
      pendingSpace = null;
      normalized += char;
      positions.push({ node, offset });
    }
  }
  const start = normalized.indexOf(wanted);
  if (start < 0 || !positions[start] || !positions[start + wanted.length - 1]) return null;
  const first = positions[start]!;
  const last = positions[start + wanted.length - 1]!;
  const range = document.createRange();
  range.setStart(first.node, first.offset);
  range.setEnd(last.node, last.offset + 1);
  return range;
}

/** Wraps every text-node fragment in a selection, so inline markup and multi-node selections work. */
function wrapRange(range: Range, color: NoteColor): boolean {
  const nodes = textNodesInMain().filter((node) => {
    try {
      return range.intersectsNode(node) && !node.parentElement?.closest("mark");
    } catch {
      return false;
    }
  });
  if (!nodes.length) return false;
  for (const node of [...nodes].reverse()) {
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    const start = range.compareBoundaryPoints(Range.START_TO_START, nodeRange) > 0 ? range.startOffset : 0;
    const end = range.compareBoundaryPoints(Range.END_TO_END, nodeRange) < 0 ? range.endOffset : node.data.length;
    if (end <= start) continue;
    const selected = node.splitText(start);
    selected.splitText(end - start);
    const mark = document.createElement("mark");
    mark.className = markClass(color);
    mark.title = "Saved highlight";
    selected.replaceWith(mark);
    mark.appendChild(selected);
  }
  return true;
}

function applyHighlight(excerpt: string, color: NoteColor): boolean {
  const range = normalizedRange(excerpt, textNodesInMain());
  return range ? wrapRange(range, color) : false;
}

function restoreHighlights(highlights: Array<{ href: string; excerpt: string; highlightColor: NoteColor }>): number {
  const current = `${window.location.origin}${window.location.pathname}`;
  let restored = 0;
  for (const highlight of highlights) {
    if (highlight.href === current && highlight.excerpt && applyHighlight(highlight.excerpt, highlight.highlightColor)) restored += 1;
  }
  return restored;
}

function sourceKind(pathname: string): SelectionInfo["kind"] {
  if (pathname.startsWith("/news") || pathname.startsWith("/blogs")) return "article";
  if (pathname.startsWith("/courses")) return "course";
  if (pathname.startsWith("/design")) return "design";
  if (pathname.startsWith("/dsa") || pathname.startsWith("/problems")) return "problem";
  if (pathname.startsWith("/mock") || pathname.startsWith("/web/interview")) return "interview";
  if (pathname.startsWith("/learn") || pathname.startsWith("/web")) return "lesson";
  return "other";
}

function selectionFromWindow(): SelectionInfo | null {
  const selection = window.getSelection();
  const text = selection?.toString().trim().replace(/\s+/g, " ") ?? "";
  if (!selection || !text || text.length < 3 || text.length > 8_000 || selection.rangeCount === 0) return null;
  const anchor = selection.anchorNode;
  if (anchor instanceof HTMLElement && (anchor.closest("input, textarea, button, [contenteditable=true]") || anchor.closest("[data-no-selection-toolbar]"))) return null;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const heading = (range.commonAncestorContainer.parentElement?.closest("section, article")?.querySelector("h1,h2,h3")?.textContent ?? "").trim().slice(0, 200);
  const pathname = window.location.pathname;
  return { text, href: `${window.location.origin}${pathname}`, title: document.title.replace(/\s*[|·].*$/, "").trim() || "PrepOS", kind: sourceKind(pathname), heading, x: Math.min(Math.max(rect.left, 12), window.innerWidth - 380), y: Math.max(rect.top - 58, 12) };
}

export function SelectionToolbar({ highlights = [] }: { highlights?: Array<{ href: string; excerpt: string; highlightColor: NoteColor }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [ai, setAi] = useState<AiState>(null);
  const [color, setColor] = useState<NoteColor>("yellow");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let attempts = 0;
    let timer = 0;
    const restoreWhenReady = () => {
      attempts += 1;
      if (restoreHighlights(highlights) === 0 && attempts < 10) timer = window.setTimeout(restoreWhenReady, 120);
    };
    timer = window.setTimeout(restoreWhenReady, 120);
    const update = () => {
      window.setTimeout(() => {
        const next = selectionFromWindow();
        if (next) setSelection(next);
      }, 0);
    };
    const clear = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || event.target.closest("[data-selection-toolbar]")) return;
      window.setTimeout(() => {
        if (!window.getSelection()?.toString().trim()) {
          setSelection(null);
          setAi(null);
        }
      }, 120);
    };
    document.addEventListener("mouseup", update);
    document.addEventListener("touchend", update);
    document.addEventListener("mousedown", clear);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseup", update);
      document.removeEventListener("touchend", update);
      document.removeEventListener("mousedown", clear);
    };
  }, [highlights, pathname]);

  if (!selection) return null;

  const save = (extra?: { body?: string; flashcard?: { question: string; answer: string }; reviewOn?: string }) => startTransition(async () => {
    const result = await createCapturedNoteAction({
      title: selection.heading || selection.text.split(" ").slice(0, 10).join(" "),
      body: extra?.body ?? `> ${selection.text}`,
      excerpt: selection.text,
      source: { href: selection.href, title: selection.title, kind: selection.kind, heading: selection.heading },
      tags: ["captured"],
      highlightColor: color,
      ...(extra?.flashcard ? { flashcard: extra.flashcard } : {}),
      ...(extra?.reviewOn ? { reviewOn: extra.reviewOn } : {}),
    });
    if (result.ok) {
      toast.success("Saved to Notes");
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } else toast.error(result.error);
  });

  const highlight = () => startTransition(async () => {
    const result = await createCapturedNoteAction({
      title: selection.heading || selection.text.split(" ").slice(0, 10).join(" "),
      body: `> ${selection.text}`,
      excerpt: selection.text,
      source: { href: selection.href, title: selection.title, kind: selection.kind, heading: selection.heading },
      tags: ["highlight"],
      highlightColor: color,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (!applyHighlight(selection.text, color)) {
      toast.error("Saved the highlight, but it will appear when this page finishes rendering.");
    }
    toast.success("Highlight saved");
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  });

  const ask = (action: "explain" | "flashcard") => {
    setAi({ text: "", pending: true, action });
    void fetch("/api/ai/contextual", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, text: selection.text, source: { title: selection.title, href: selection.href, kind: selection.kind } }),
    }).then(async (response) => {
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "AI could not answer");
      setAi({ text: data.text ?? "", pending: false, action });
    }).catch((error: unknown) => setAi({ text: error instanceof Error ? error.message : "AI could not answer", pending: false, action }));
  };

  const continueInChat = () => {
    try {
      window.sessionStorage.setItem(
        "prepos:chat-selection",
        JSON.stringify({ selection: selection.text, sourceTitle: selection.title, sourceHref: selection.href }),
      );
      router.push("/chat");
    } catch {
      toast.error("Could not open the discussion. Try opening Assistant from the sidebar.");
    }
  };

  return (
    <div data-selection-toolbar className="fixed z-50 w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border bg-card p-2 shadow-lg ring-1 ring-foreground/10" style={{ left: selection.x, top: selection.y }}>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 inline-flex items-center gap-1 px-1.5 text-xs font-medium"><Highlighter className="size-3.5 text-primary" aria-hidden /> Selection</span>
        <div className="flex items-center gap-1 rounded-md border px-1 py-0.5" aria-label="Highlight color">
          {NOTE_COLORS.map((option) => (
            <button key={option} type="button" aria-label={`Use ${option} highlight`} aria-pressed={color === option} onClick={() => setColor(option)} className={cn("size-3.5 rounded-full ring-offset-1 focus-visible:ring-2 focus-visible:ring-ring", COLOR_CLASS[option], color === option && "ring-2 ring-primary")} />
          ))}
        </div>
        <Button size="xs" variant="default" disabled={pending} onClick={highlight}><Highlighter /> Highlight</Button>
        <Button size="xs" variant="outline" disabled={pending} onClick={() => save()}><StickyNote /> Save note</Button>
        <Button size="xs" variant="outline" onClick={() => ask("explain")}><Sparkles /> Explain</Button>
        <Button size="xs" variant="outline" onClick={() => ask("flashcard")}><BookOpen /> Flashcard</Button>
        <Button size="icon-xs" variant="ghost" aria-label="Copy selected text" onClick={() => void navigator.clipboard?.writeText(selection.text).then(() => toast.success("Copied"))}><Copy /></Button>
        <Button size="icon-xs" variant="ghost" aria-label="Close selection toolbar" onClick={() => setSelection(null)}><X /></Button>
      </div>
      {ai && (
        <div className={cn("mt-2 max-h-48 overflow-y-auto rounded-lg border bg-muted/40 p-2.5 text-xs leading-relaxed", ai.pending && "text-muted-foreground")} aria-live="polite">
          {ai.pending ? <span className="inline-flex items-center gap-1.5"><LoaderCircle className="size-3.5 animate-spin" /> Thinking about this selection…</span> : (
            <div className="space-y-2">
              <p>{ai.text}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="xs" variant="outline" onClick={continueInChat}><Sparkles /> Discuss in Assistant</Button>
                <Button size="xs" variant="outline" disabled={pending} onClick={() => save({ body: `> ${selection.text}\n\n${ai.text}`, ...(ai.action === "flashcard" ? { flashcard: { question: selection.text, answer: ai.text }, reviewOn: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10) } : {}) })}><StickyNote /> Save result to Notes</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
