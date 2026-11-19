"use client";

import { House, Landmark, MessageCircle, Newspaper, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const MOBILE_TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/ballot", label: "My races", icon: Landmark },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/finance", label: "Money", icon: Wallet },
  { href: "/ask", label: "Ask", icon: MessageCircle },
] as const;

export function currentTab(path: string | null, href: string) {
  if (path === href) return "page";
  if (href === "/ballot" && /^\/(races|candidates)(\/|$)/.test(path ?? "")) return "location";
  if (href !== "/" && path?.startsWith(`${href}/`)) return "location";
  return undefined;
}

export function MobileNavigation() {
  const path = usePathname();
  return (
    <nav className="mobile-tabs" aria-label="Primary">
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={currentTab(path, href)}>
          <Icon size={21} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
