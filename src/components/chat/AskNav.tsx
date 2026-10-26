"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAsk } from "@/components/chat/AskProvider";
import { isAskPanelPath } from "@/lib/chat/ui";

const controlClass =
  "rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function AskNav() {
  const pathname = usePathname();
  const ask = useAsk();
  const onChat = pathname === "/chat";

  if (!isAskPanelPath(pathname) || onChat) {
    return (
      <Link href="/chat" aria-current={onChat ? "page" : undefined} className={controlClass}>
        Ask
      </Link>
    );
  }

  return (
    <button
      type="button"
      ref={ask.triggerRef}
      className={controlClass}
      aria-expanded={ask.open}
      aria-controls="ask-panel"
      aria-haspopup="dialog"
      onClick={() => ask.setOpen(!ask.open)}
    >
      Ask
    </button>
  );
}
