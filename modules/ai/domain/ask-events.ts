import { z } from "zod";

/** The events /api/ai/ask streams, shared by the service that makes them and the client that reads them. */
export const questionSchema = z.string().trim().min(3, "Ask a full question").max(500, "Keep the question under 500 characters");

export const sourceSchema = z.object({ n: z.number().int().min(1), ref: z.string(), title: z.string(), href: z.string().nullable() });
export type AskSource = z.infer<typeof sourceSchema>;

export const doneSchema = z.object({
  answer: z.string(),
  /** Citations resolved to the retrieved passages. Never contains a number that was not retrieved. */
  cited: z.array(sourceSchema),
  grounded: z.boolean(),
  notFound: z.boolean(),
  cached: z.boolean(),
  provider: z.string().optional(),
});
export type AskDone = z.infer<typeof doneSchema>;

export const askEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sources"), sources: z.array(sourceSchema), mode: z.enum(["hybrid", "keyword", "vector"]) }),
  z.object({ type: z.literal("token"), text: z.string() }),
  z.object({ type: z.literal("done"), result: doneSchema }),
  z.object({ type: z.literal("error"), error: z.string(), unavailable: z.literal(true).optional() }),
]);
export type AskEvent = z.infer<typeof askEventSchema>;
