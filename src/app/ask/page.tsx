import type { Metadata } from "next";
import { Suspense } from "react";
import { COMPARE_RACE_IDS, compareBasis, compareOption } from "@/lib/compare/evidence";
import { ChatPage } from "@/components/chat/ChatPage";

export const metadata: Metadata = { alternates: { canonical: "/ask" }, title: "Ask" };

export default function AskPage() {
  const options = COMPARE_RACE_IDS.flatMap((raceId) => {
    const basis = compareBasis(raceId);
    return basis ? [compareOption(basis)] : [];
  });
  return (
    <Suspense fallback={<p className="wrap">Loading ask…</p>}>
      <ChatPage options={options} />
    </Suspense>
  );
}
