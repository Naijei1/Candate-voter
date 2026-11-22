"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** `short` shows on narrow desktop widths. The mobile menu always uses the full label. */
export const NAV_LINKS = [
  { href: "/news", label: "News Feed", short: "News Feed" },
  { href: "/finance", label: "Candidates' Political Finances", short: "Political Finances" },
  { href: "/ask", label: "Ask", short: "Ask" },
] as const;

export function HeaderFrame({
  wordmark,
  account,
  signedIn,
}: {
  wordmark: ReactNode;
  account: ReactNode;
  signedIn: boolean;
}) {
  const path = usePathname();
  const overlay = path === "/";
  const findHref = overlay ? "/#map" : "/ballot";
  return (
    <header className={overlay ? "site-header is-overlay" : "site-header"}>
      <div className="nav-bar">
        {wordmark}
        <nav className="nav-desktop" aria-label="Primary">
          <Link href={findHref}>Find my races</Link>
          <Link href="/candidates" aria-current={active(path, "/candidates") ? "page" : undefined}>Candidates</Link>
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} aria-current={active(path, item.href) ? "page" : undefined}>
              {item.short === item.label ? (
                item.label
              ) : (
                <>
                  <span className="label-long">{item.label}</span>
                  <span className="label-short">{item.short}</span>
                </>
              )}
            </Link>
          ))}
        </nav>
        {account}
        <details className="nav-mobile">
          <summary>Menu</summary>
          <div>
            <Link href={findHref}>Find my races</Link>
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} aria-current={active(path, item.href) ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
            {signedIn ? <Link href="/account">My watchlist</Link> : <Link href="/sign-in">Sign in</Link>}
          </div>
        </details>
      </div>
    </header>
  );
}

function active(path: string | null, href: string): boolean {
  if (!path) return false;
  return path === href || path.startsWith(`${href}/`);
}
