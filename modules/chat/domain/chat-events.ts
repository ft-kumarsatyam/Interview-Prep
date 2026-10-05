import { z } from "zod";
import { TOOL_IDS } from "@/modules/chat/domain/chat-tools";

/** The request and the newline-delimited JSON events of /api/ai/chat, shared by the service and the client. */
export const MAX_MESSAGE = 2000;

export const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/, "Invalid id");

export const chatRequestSchema = z.object({
  threadId: objectIdSchema.optional(),
  message: z.string().trim().min(1, "Type a message").max(MAX_MESSAGE, `Keep it under ${MAX_MESSAGE} characters`),
  /** The app page the question is about ("Ask about this page"). */
  page: z
    .string()
    .max(200)
    .regex(/^\/[\w\-/.%?=&]*$/, "Invalid page")
    .optional(),
  context: z
    .object({
      selection: z.string().trim().min(1).max(8_000),
      sourceTitle: z.string().trim().min(1).max(200),
      sourceHref: z.string().url().max(500),
    })
    .optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatToolUseSchema = z.object({ name: z.enum(TOOL_IDS), label: z.string() });
export type ChatToolUse = z.infer<typeof chatToolUseSchema>;

export const chatEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("thread"), threadId: objectIdSchema, title: z.string(), created: z.boolean() }),
  z.object({ type: z.literal("tools"), tools: z.array(chatToolUseSchema) }),
  z.object({ type: z.literal("token"), text: z.string() }),
  z.object({ type: z.literal("done"), messageId: objectIdSchema, provider: z.string().optional() }),
  z.object({ type: z.literal("error"), error: z.string(), unavailable: z.literal(true).optional() }),
]);
export type ChatEvent = z.infer<typeof chatEventSchema>;
