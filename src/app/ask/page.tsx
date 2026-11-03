import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatPage } from "@/components/chat/ChatPage";

export const metadata: Metadata = { title: "Ask" };

export default function AskPage() {
  return (
    <Suspense fallback={<p className="wrap">Loading ask…</p>}>
      <ChatPage />
    </Suspense>
  );
}
