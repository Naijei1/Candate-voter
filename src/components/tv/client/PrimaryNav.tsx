"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/tv/nav";
import { YoursLink } from "./Yours";

/** Which section a path belongs to. Race and candidate pages sit under My races. */
export function sectionOf(pathname: string): string | null {
  if (/^\/(ballot|races|candidates|states)(\/|$)/.test(pathname)) return "/ballot";
  if (/^\/(finance)(\/|$)/.test(pathname)) return "/finance";
  if (/^\/news(\/|$)/.test(pathname)) return "/news";
  if (/^\/(search|ask)(\/|$)/.test(pathname)) return "/search";
  return null;
}

/** Desktop section links. Search is the header button next to them. */
export function PrimaryNav() {
  const pathname = usePathname() ?? "/";
  const section = sectionOf(pathname);
  return (
    <nav className="nav" aria-label="Primary">
      {NAV.filter((item) => item.href !== "/search").map((item) =>
        item.href === "/ballot" ? (
          <YoursLink key={item.href} aria-current={section === item.href ? "page" : undefined}>
            {item.label}
          </YoursLink>
        ) : (
          <Link key={item.href} href={item.href} aria-current={section === item.href ? "page" : undefined}>
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}
