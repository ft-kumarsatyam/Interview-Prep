"use client";

import { useEffect, useRef } from "react";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { indentUnit } from "@codemirror/language";
import { Compartment, EditorState, Prec, type Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import { useTheme } from "next-themes";
import type { Language } from "@/lib/domain/starters";
import { cn } from "@/lib/utils";

const languageExtension = (lang: Language): Extension =>
  lang === "python" ? [python(), indentUnit.of("    ")] : [javascript({ typescript: lang === "typescript" }), indentUnit.of("  ")];

const sizing = (fontSize: number, minHeight: string, fill: boolean) =>
  EditorView.theme({
    "&": fill ? { height: "100%", fontSize: `${fontSize}px` } : { minHeight, fontSize: `${fontSize}px` },
    ".cm-scroller": { fontFamily: "var(--font-jetbrains)", ...(fill ? { overflow: "auto" } : {}) },
  });

export function CodeEditor({
  value,
  onChange,
  onRun,
  onSubmit,
  onSave,
  language = "typescript",
  fontSize = 13,
  minHeight = "320px",
  fill = false,
  ariaLabel = "Code editor",
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  onRun?: () => void;
  /** Mod-Shift-Enter. */
  onSubmit?: () => void;
  onSave?: () => void;
  language?: Language;
  fontSize?: number;
  minHeight?: string;
  /** Fill the parent's height and scroll inside, instead of growing with the content. */
  fill?: boolean;
  ariaLabel?: string;
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
          langSlot.current.of(languageExtension(language)),
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
    view.current?.dispatch({ effects: themeSlot.current.reconfigure(resolvedTheme === "light" ? [] : oneDark) });
  }, [resolvedTheme]);

  useEffect(() => {
    view.current?.dispatch({ effects: langSlot.current.reconfigure(languageExtension(language)) });
  }, [language]);

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
