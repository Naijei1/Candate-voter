import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Officeholders" };

export default function OfficeholdersPage() {
  return (
    <article className="wrap">
      <h1>Current officeholders</h1>
      <p>
        This directory is separate from people who have filed to run. It is not loaded. No names
        are shown, so a gap is not mistaken for a vacancy list.
      </p>
      <p>
        <Link href="/candidates">People who have filed</Link>
      </p>
    </article>
  );
}
