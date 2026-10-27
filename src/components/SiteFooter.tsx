import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line py-4 text-sm text-muted">
      <Link
        href="/agent"
        className="font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        Agent API
      </Link>
    </footer>
  );
}
