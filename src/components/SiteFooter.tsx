import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line py-6 text-sm leading-6 text-muted">
      <p>
        Candate is a nonpartisan civic information project. It does not endorse
        candidates, rank them, or tell you how to vote.{" "}
        <Link
          href="/agent"
          className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Agent API
        </Link>
      </p>
      <p className="mt-3">
        Race and candidate figures show a source link and the time the row was
        written. Each statement of candidacy (Form 2) also shows when it was retrieved. A filing
        date appears only when a source provides one.
      </p>
    </footer>
  );
}
