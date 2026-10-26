"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ChatShell } from "@/components/chat/ChatShell";
import { useAsk } from "@/components/chat/AskProvider";
import { contextFromLocation, MAX_CHAT_MESSAGE } from "@/lib/chat/ui";

export function ChatPage() {
  const ask = useAsk();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const located = contextFromLocation({
    pathname,
    searchParams,
    cycles: ask.cycles,
  });
  const applied = useRef(false);

  useEffect(() => {
    if (!ask.chat.ready || applied.current) return;
    applied.current = true;
    const question = searchParams.get("q");
    if (!question || ask.chat.turns.length > 0 || ask.chat.draft.trim()) return;
    ask.chat.setDraft(question.slice(0, MAX_CHAT_MESSAGE));
  }, [ask.chat, searchParams]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <ChatShell mode="page" context={located} chat={ask.chat} />
    </div>
  );
}
