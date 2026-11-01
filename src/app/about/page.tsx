import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/content/brand";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <article className="wrap">
      <h1>About Us</h1>
      <p>
        {brand.founderName} is the founder. The platform is meant to help people find their
        contests, compare candidates on shared fields, and follow sourced updates.
      </p>
      <div className="photo-slot" role="img" aria-label="Placeholder for an approved founder photograph.">
        <StatusMark kind="awaiting" />
        Founder photograph
      </div>
      <h2>Biography</h2>
      <p>
        <StatusMark kind="awaiting" />
        Approved biographical details have not been added. This page does not describe an employer
        or imply an institutional endorsement.
      </p>
      <h2>Contact</h2>
      <p>
        <Link href="/contact">Contact and corrections</Link>
      </p>
      <h2>Standards</h2>
      <p>
        <StatusMark kind="awaiting" />
        Ownership, funding, affiliations, editorial standards, and the corrections policy are
        awaiting approved copy. See <Link href="/sources">sources and methodology</Link> for what
        the site can show today.
      </p>
    </article>
  );
}
