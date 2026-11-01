import type { Metadata } from "next";
import Link from "next/link";
import { NewsBoard } from "@/components/site/AlertDemo";

export const metadata: Metadata = { title: "News and Updates" };

export default function NewsPage() {
  return (
    <article className="wrap">
      <h1>News and Updates</h1>
      <p>
        A wider election-news view will sit beside a personal feed. The cards on this page are
        samples. Campaign statements, reporting, and our own analysis will be labeled differently
        when real items exist.
      </p>
      <NewsBoard />
      <p>
        Alert delivery is separate. <Link href="/account">Alert preferences</Link>
      </p>
    </article>
  );
}
