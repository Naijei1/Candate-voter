import type { Metadata } from "next";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "Polls and analysis" };

export default function PollsPage() {
  return (
    <article className="wrap">
      <h1>Polls</h1>
      <p className="lede">No qualifying polls available.</p>
      <p>
        <StatusMark kind="sample" /> A real poll would name its pollster, dates, and sample.
      </p>
    </article>
  );
}
