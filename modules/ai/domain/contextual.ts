import { z } from "zod";

export const contextualActionSchema = z.enum(["explain", "ask", "compare", "example", "follow-up", "interview-answer", "flashcard", "practice"]);
export const contextualRequestSchema = z.object({
  action: contextualActionSchema,
  text: z.string().trim().min(3).max(8_000),
  source: z.object({
    title: z.string().trim().min(1).max(200),
    href: z.string().url().max(500),
    kind: z.string().max(40),
  }),
});

export const contextualResponseSchema = z.object({ text: z.string().trim().min(1).max(4_000) });
export type ContextualRequest = z.infer<typeof contextualRequestSchema>;
