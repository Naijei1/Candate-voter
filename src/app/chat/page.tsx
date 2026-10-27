import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatPage } from "@/components/chat/ChatPage";

export const metadata: Metadata = {
  title: "Ask",
  description: "Ask factual questions about federal races and filings.",
};

export default function ChatRoute() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading ask…</p>}>
      <ChatPage />
    </Suspense>
  );
}
