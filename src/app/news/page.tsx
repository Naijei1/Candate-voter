import type { Metadata } from "next";
import Link from "next/link";
import { NewsBoard } from "@/components/site/AlertDemo";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "News and Updates" };

export default function NewsPage() {
  return (
    <article className="wrap">
      <h1>News</h1>
      <p className="lede">
        <StatusMark kind="sample" /> Choices stay on this page. <Link href="/account">Alerts</Link>
      </p>
      <NewsBoard />
    </article>
  );
}
