"use client";

import { useEffect, useRef } from "react";
import { javascript } from "@codemirror/lang-javascript";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function CodeEditor({
  value,
  onChange,
  onRun,
  onSave,
  minHeight = "320px",
  ariaLabel = "Code editor",
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  onRun?: () => void;
  onSave?: () => void;
  minHeight?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const themeSlot = useRef(new Compartment());
  const handlers = useRef({ onChange, onRun, onSave });
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    handlers.current = { onChange, onRun, onSave };
  });

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          javascript({ typescript: true }),
          Prec.highest(
            keymap.of([
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
          EditorView.theme({ "&": { minHeight, fontSize: "13px" }, ".cm-scroller": { fontFamily: "var(--font-jetbrains)" } }),
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

  return (
    <div
      ref={host}
      className={cn("overflow-hidden rounded-lg border focus-within:ring-2 focus-within:ring-ring/50 [&_.cm-editor]:outline-none", className)}
    />
  );
}
