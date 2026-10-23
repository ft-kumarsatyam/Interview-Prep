"use client";

import { useEffect, useRef } from "react";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { PostgreSQL, sql, SQLite } from "@codemirror/lang-sql";
import { indentUnit } from "@codemirror/language";
import { lintGutter, setDiagnostics } from "@codemirror/lint";
import { Compartment, EditorState, Prec, type Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import { useTheme } from "next-themes";
import type { Language } from "@/modules/dsa/domain/starters";
import { cn } from "@/core/utils";

/** The runnable languages plus SQL, which the DB Lab uses (it isn't a DSA language). */
export type EditorLanguage = Language | "sql";

export type SqlDialect = "sqlite" | "postgres";

const languageExtension = (lang: EditorLanguage, dialect: SqlDialect = "sqlite"): Extension =>
  lang === "python"
    ? [python(), indentUnit.of("    ")]
    : lang === "sql"
      ? [sql({ dialect: dialect === "postgres" ? PostgreSQL : SQLite }), indentUnit.of("  ")]
      : [javascript({ typescript: lang === "typescript" }), indentUnit.of("  ")];

const sizing = (fontSize: number, minHeight: string, fill: boolean) =>
  EditorView.theme({
    "&": fill ? { height: "100%", fontSize: `${fontSize}px` } : { minHeight, fontSize: `${fontSize}px` },
    ".cm-scroller": { fontFamily: "var(--font-jetbrains)", ...(fill ? { overflow: "auto" } : {}) },
  });

export interface EditorMarkerInput {
  line: number;
  column?: number;
  message: string;
}

/** Ask the editor to move the cursor to a line (a new `nonce` repeats the request for the same line). */
export interface EditorReveal {
  line: number;
  column?: number;
  nonce: number;
}

export function CodeEditor({
  value,
  onChange,
  onRun,
  onSubmit,
  onSave,
  language = "typescript",
  sqlDialect = "sqlite",
  fontSize = 13,
  minHeight = "320px",
  fill = false,
  ariaLabel = "Code editor",
  markers,
  reveal,
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  onRun?: () => void;
  /** Mod-Shift-Enter. */
  onSubmit?: () => void;
  onSave?: () => void;
  language?: EditorLanguage;
  /** Highlighting and completion dialect when `language` is "sql". */
  sqlDialect?: SqlDialect;
  fontSize?: number;
  minHeight?: string;
  /** Fill the parent's height and scroll inside, instead of growing with the content. */
  fill?: boolean;
  ariaLabel?: string;
  /** Error markers to underline (for example the line a run failed on). */
  markers?: EditorMarkerInput[];
  /** Move the cursor to a line and scroll it into view. */
  reveal?: EditorReveal;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const themeSlot = useRef(new Compartment());
  const langSlot = useRef(new Compartment());
  const sizeSlot = useRef(new Compartment());
  const handlers = useRef({ onChange, onRun, onSubmit, onSave });
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    handlers.current = { onChange, onRun, onSubmit, onSave };
  });

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          lintGutter(),
          langSlot.current.of(languageExtension(language, sqlDialect)),
          Prec.highest(
            keymap.of([
              {
                key: "Mod-Shift-Enter",
                run: () => {
                  if (!handlers.current.onSubmit) return false;
                  handlers.current.onSubmit();
                  return true;
                },
              },
              {
                key: "Mod-Enter",
                run: () => {
                  handlers.current.onRun?.();
                  return true;
                },
              },
              {
                key: "Mod-s",
                preventDefault: true,
                run: () => {
                  if (!handlers.current.onSave) return false;
                  handlers.current.onSave();
                  return true;
                },
              },
            ]),
          ),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) handlers.current.onChange(u.state.doc.toString());
          }),
          EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
          sizeSlot.current.of(sizing(fontSize, minHeight, fill)),
          themeSlot.current.of([]),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // The editor is created once; later prop changes flow through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const doc = v.state.doc;
    const diagnostics = (markers ?? [])
      .filter((m) => m.line >= 1 && m.line <= doc.lines)
      .map((m) => {
        const line = doc.line(m.line);
        const from = Math.min(line.from + Math.max(0, (m.column ?? 1) - 1), line.to);
        return { from, to: line.to > from ? line.to : Math.min(from + 1, doc.length), severity: "error" as const, message: m.message };
      });
    v.dispatch(setDiagnostics(v.state, diagnostics));
  }, [markers]);

  const revealNonce = reveal?.nonce;
  useEffect(() => {
    const v = view.current;
    if (!v || !reveal) return;
    const line = v.state.doc.line(Math.min(Math.max(reveal.line, 1), v.state.doc.lines));
    const pos = Math.min(line.from + Math.max(0, (reveal.column ?? 1) - 1), line.to);
    v.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) });
    v.focus();
    // Only a new request (nonce) moves the cursor, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealNonce]);

  useEffect(() => {
    view.current?.dispatch({ effects: themeSlot.current.reconfigure(resolvedTheme === "light" ? [] : oneDark) });
  }, [resolvedTheme]);

  useEffect(() => {
    view.current?.dispatch({ effects: langSlot.current.reconfigure(languageExtension(language, sqlDialect)) });
  }, [language, sqlDialect]);

  useEffect(() => {
    view.current?.dispatch({ effects: sizeSlot.current.reconfigure(sizing(fontSize, minHeight, fill)) });
  }, [fontSize, minHeight, fill]);

  return (
    <div
      ref={host}
      className={cn("overflow-hidden rounded-lg border focus-within:ring-2 focus-within:ring-ring/50 [&_.cm-editor]:outline-none", fill && "h-full", className)}
    />
  );
}
