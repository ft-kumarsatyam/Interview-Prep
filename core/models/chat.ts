import { ownerScope } from "@/core/db/owner-scope";
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { TOOL_IDS } from "@/modules/chat/domain/chat-tools";

/** One assistant conversation. Never read by the planner or the streak. */
const chatThreadSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 80 },
    archived: { type: Boolean, default: false },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);
ownerScope(chatThreadSchema);
chatThreadSchema.index({ ownerId: 1, archived: 1, lastMessageAt: -1 });

/** One turn. Text only (rendered as text, never HTML); `tools` records which data views the answer used. */
const chatMessageSchema = new Schema(
  {
    threadId: { type: Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    text: { type: String, required: true, maxlength: 12_000 },
    tools: { type: [String], enum: TOOL_IDS, default: [] },
    provider: { type: String, default: null },
    /** The reply failed or was cut off; kept so the conversation shows what happened. */
    failed: { type: Boolean, default: false },
  },
  { timestamps: true },
);
ownerScope(chatMessageSchema);
chatMessageSchema.index({ ownerId: 1, threadId: 1, createdAt: 1 });

export type ChatThreadDoc = InferSchemaType<typeof chatThreadSchema>;
export type ChatMessageDoc = InferSchemaType<typeof chatMessageSchema>;
export const ChatThread: Model<ChatThreadDoc> = models.ChatThread ?? model("ChatThread", chatThreadSchema);
export const ChatMessage: Model<ChatMessageDoc> = models.ChatMessage ?? model("ChatMessage", chatMessageSchema);
