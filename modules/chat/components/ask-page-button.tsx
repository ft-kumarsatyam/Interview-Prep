"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Top-bar shortcut: opens a new assistant chat about the page you are on. */
export function AskPageButton() {
  const pathname = usePathname();
  const onChat = pathname === "/chat" || pathname.startsWith("/chat/");
  const href = onChat ? "/chat" : `/chat?page=${encodeURIComponent(pathname)}`;
  return (
    <Button asChild variant="ghost" size="icon" className="size-9" aria-label={onChat ? "New chat" : "Ask the assistant about this page"} title={onChat ? "New chat" : "Ask about this page"}>
      <Link href={href}>
        <Bot aria-hidden />
      </Link>
    </Button>
  );
}
