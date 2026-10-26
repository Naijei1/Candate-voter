import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line py-4">
      <div className="flex items-baseline justify-between gap-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Candate
        </Link>
        <p className="text-sm text-muted">Nonpartisan federal races</p>
      </div>
    </header>
  );
}
