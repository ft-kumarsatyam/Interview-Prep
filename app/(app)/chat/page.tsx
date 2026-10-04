import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { env } from "@/core/env";
import { resolveProviders } from "@/core/llm/providers";
import { ChatWorkspace } from "@/modules/chat/components/chat-workspace";
import { chatRequestSchema, objectIdSchema } from "@/modules/chat/domain/chat-events";
import { getThread, listThreads } from "@/modules/chat/services/chat";

export const metadata: Metadata = { title: "Assistant" };

const pageSchema = chatRequestSchema.shape.page;

export default async function ChatPage({ searchParams }: PageProps<"/chat">) {
  const sp = await searchParams;
  const rawThread = typeof sp.t === "string" ? sp.t : undefined;
  const threadId = rawThread && objectIdSchema.safeParse(rawThread).success ? rawThread : null;
  const rawPage = typeof sp.page === "string" ? sp.page : undefined;
  const page = rawPage && pageSchema.safeParse(rawPage).success ? rawPage : null;
  const [threads, current] = await Promise.all([listThreads(), threadId ? getThread(threadId) : null]);
  const aiAvailable = resolveProviders(env()).some((p) => !p.paid);

  return (
    <>
      <PageHeader icon={Bot} title="Assistant" description="Ask about your plan, progress, notes, jobs or how PrepOS works. Answers come from your own data and free AI providers; your resume is never shared." />
      <ChatWorkspace
        key={current?.thread.id ?? `new-${page ?? ""}`}
        threads={threads.map((t) => ({ id: t.id, title: t.title, lastMessageAt: t.lastMessageAt }))}
        thread={current ? { id: current.thread.id, title: current.thread.title } : null}
        messages={current?.messages ?? []}
        page={page}
        aiAvailable={aiAvailable}
      />
    </>
  );
}
