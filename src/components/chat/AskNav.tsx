"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAsk } from "@/components/chat/AskProvider";
import { isAskPanelPath } from "@/lib/chat/ui";

const askClass =
  "ask-entry inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export function AskNav() {
  const pathname = usePathname();
  const ask = useAsk();
  const onChat = pathname === "/chat";

  if (!isAskPanelPath(pathname) || onChat) {
    return (
      <Link href="/chat" aria-current={onChat ? "page" : undefined} className={askClass}>
        <AskMark />
        Ask
      </Link>
    );
  }

  return (
    <button
      type="button"
      ref={ask.triggerRef}
      className={askClass}
      aria-expanded={ask.open}
      aria-controls="ask-panel"
      aria-haspopup="dialog"
      onClick={() => ask.setOpen(!ask.open)}
    >
      <AskMark />
      Ask
    </button>
  );
}

function AskMark() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4.5h12a1 1 0 0 1 1 1v6.2a1 1 0 0 1-1 1H8.2L4.5 16.2V12.7H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
