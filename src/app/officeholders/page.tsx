import type { Metadata } from "next";
import Link from "next/link";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "Officeholders" };

export default function OfficeholdersPage() {
  return (
    <article className="wrap">
      <h1>Officeholders</h1>
      <p>
        <StatusMark kind="gap" /> Not loaded.
      </p>
      <p>
        <Link href="/candidates">Candidates</Link>
      </p>
    </article>
  );
}
