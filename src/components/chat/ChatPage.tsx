"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CompareSection } from "@/components/home/CompareSection";
import type { CompareOption } from "@/lib/compare/evidence";
import { ChatShell } from "@/components/chat/ChatShell";
import { useAsk } from "@/components/chat/AskProvider";
import { yearFromRaceId } from "@/lib/chat/intent";
import { contextFromLocation, MAX_CHAT_MESSAGE } from "@/lib/chat/ui";

export function ChatPage({ options }: { options: readonly CompareOption[] }) {
  const ask = useAsk();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const located = contextFromLocation({
    pathname,
    searchParams,
    cycles: ask.cycles,
  });
  const [selected, setSelected] = useState<string>();
  const raceId = options.some((option) => option.raceId === located.raceId) ? located.raceId : options[0]?.raceId;
  const activeRaceId = selected ?? raceId;
  const context = activeRaceId && (selected || !located.raceId)
    ? { ...located, raceId: activeRaceId, cycle: yearFromRaceId(activeRaceId) ?? located.cycle, candidateId: undefined, messagePrefix: undefined }
    : located;
  const applied = useRef(false);

  useEffect(() => {
    if (!ask.chat.ready || applied.current) return;
    applied.current = true;
    const question = searchParams.get("q");
    if (!question || ask.chat.turns.length > 0 || ask.chat.draft.trim()) return;
    ask.chat.setDraft(question.slice(0, MAX_CHAT_MESSAGE));
  }, [ask.chat, searchParams]);

  return (
    <div className="wrap ask-page">
      <h1>Ask</h1>
      <section aria-labelledby="ask-compare-heading">
        <h2 id="ask-compare-heading" className="sr-only">Compare candidates</h2>
        <CompareSection key={raceId} options={options} initialRaceId={raceId} onRaceChange={setSelected} compact />
      </section>
      <ChatShell mode="page" context={context} chat={ask.chat} />
    </div>
  );
}
