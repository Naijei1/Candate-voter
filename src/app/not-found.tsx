import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-base leading-7 text-muted">
        That race or candidate is not stored.
      </p>
      <p>
        <Link
          href="/"
          className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Back to federal races
        </Link>
      </p>
    </div>
  );
}
