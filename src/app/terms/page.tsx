import type { Metadata } from "next";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="wrap">
      <h1>Terms</h1>
      <p>
        <StatusMark kind="awaiting" />
        Terms of use are awaiting approved copy.
      </p>
      <p>
        Until then: sample and preview labels mean the content is not a live record. The site does
        not tell you how to vote.
      </p>
    </article>
  );
}
