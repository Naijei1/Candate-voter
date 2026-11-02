import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/content/brand";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <article className="wrap">
      <h1>About Us</h1>
      <p className="lede">{brand.founderName}, founder.</p>
      <p>
        <StatusMark kind="awaiting" /> Biography and photo.
      </p>
      <p>
        <Link href="/contact">Contact</Link>
        {" · "}
        <Link href="/sources">About this data</Link>
      </p>
    </article>
  );
}
