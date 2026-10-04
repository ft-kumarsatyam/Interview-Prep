"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AskSubject } from "@/modules/ai/domain/ask-subjects";

export interface AiContextValue {
  /** Your Gemini project links by subject (from Settings). */
  links: Partial<Record<AskSubject, string>>;
  /** True when at least one AI provider key is configured, so in-app AI buttons make sense. */
  aiAvailable: boolean;
}

const AiContext = createContext<AiContextValue>({ links: {}, aiAvailable: false });

export function AiProvider({ links, aiAvailable, children }: AiContextValue & { children?: ReactNode }) {
  return <AiContext.Provider value={{ links, aiAvailable }}>{children}</AiContext.Provider>;
}

export const useAi = () => useContext(AiContext);
