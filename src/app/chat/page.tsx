import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatPage } from "@/components/chat/ChatPage";

export const metadata: Metadata = {
  title: "Ask",
  description: "Ask about Kentucky’s races.",
};

export default function ChatRoute() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading ask…</p>}>
      <ChatPage />
    </Suspense>
  );
}
