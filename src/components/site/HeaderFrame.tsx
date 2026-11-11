"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LINKS = [
  { href: "/updates", label: "Updates" },
  { href: "/finance", label: "Money" },
  { href: "/ask", label: "Ask" },
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
          {LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        {account}
        <details className="nav-mobile">
          <summary>Menu</summary>
          <div>
            <Link href={findHref}>Find my races</Link>
            {LINKS.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            {signedIn ? <Link href="/account">Saved races</Link> : <Link href="/sign-in">Sign in</Link>}
          </div>
        </details>
      </div>
    </header>
  );
}
