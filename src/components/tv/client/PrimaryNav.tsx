"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { Icon } from "../Icon";
import { PopMenu } from "./PopMenu";
import { YoursLink } from "./Yours";

export type NavItem = { href: string; title: string; sub: string; rule?: boolean };

function inSection(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function PrimaryNav({ candidates, polls }: { candidates: NavItem[]; polls: NavItem[] }) {
  const pathname = usePathname() ?? "/";
  const current = (href: string) => (pathname === href ? "page" : undefined);
  const menu = (items: NavItem[]) =>
    items.map((item) => (
      <Fragment key={item.href}>
        {item.rule ? <hr /> : null}
        <Link href={item.href} role="menuitem" aria-current={current(item.href)}>
          <b>{item.title}</b>
          <span>{item.sub}</span>
        </Link>
      </Fragment>
    ));

  return (
    <nav className="nav" aria-label="Primary">
      <YoursLink aria-current={inSection(pathname, ["/ballot"]) ? "page" : undefined}>Find my races</YoursLink>
      <PopMenu
        label="Candidates"
        buttonClass={inSection(pathname, ["/races", "/candidates", "/states", "/officeholders"]) ? "nav-b cur" : "nav-b"}
        button={
          <>
            Candidates
            <Icon name="down" size="xs" />
          </>
        }
      >
        {menu(candidates)}
      </PopMenu>
      <Link href="/news" aria-current={inSection(pathname, ["/news"]) ? "page" : undefined}>
        News and Updates
      </Link>
      <PopMenu
        label="Polls and Analysis"
        buttonClass={inSection(pathname, ["/polls", "/measures"]) ? "nav-b cur" : "nav-b"}
        button={
          <>
            Polls and Analysis
            <Icon name="down" size="xs" />
          </>
        }
      >
        {menu(polls)}
      </PopMenu>
      <Link href="/finance" aria-current={inSection(pathname, ["/finance"]) ? "page" : undefined}>
        Campaign Finance
      </Link>
    </nav>
  );
}
