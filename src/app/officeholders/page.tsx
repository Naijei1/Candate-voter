import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Who holds office now" };

export default function OfficeholdersPage() {
  return (
    <article className="wrap">
      <h1>Who holds office now</h1>
      <p className="lede">That list is not loaded yet. You can still see people who have filed to run.</p>
      <p>
        <Link className="btn btn-navy" href="/states/ky">
          See Kentucky races
        </Link>
      </p>
    </article>
  );
}
