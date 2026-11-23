"use client";

import { House, Landmark, MessageCircle, Newspaper, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/site/SessionProvider";

export const MOBILE_TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/ballot", label: "My races", icon: Landmark },
  { href: "/news", label: "News Feed", icon: Newspaper },
  { href: "/finance", label: "Finances", icon: Wallet },
  { href: "/ask", label: "Ask", icon: MessageCircle },
] as const;

export function currentTab(path: string | null, href: string) {
  if (path === href) return "page";
  if (href === "/ballot" && /^\/(races|candidates)(\/|$)/.test(path ?? "")) return "location";
  if (href !== "/" && path?.startsWith(`${href}/`)) return "location";
  return undefined;
}

/** Text fields that raise the on-screen keyboard. */
export function raisesKeyboard(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).matches !== "function") return false;
  const element = target as Element;
  if (element.matches("textarea, [contenteditable=''], [contenteditable='true']")) return true;
  if (!element.matches("input")) return false;
  const type = (element.getAttribute("type") ?? "text").toLowerCase();
  return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(type);
}

/** The keyboard is open when a text field has focus or the visual viewport has shrunk a lot. */
export function keyboardOpen(input: { focusedField: boolean; layoutHeight: number; visualHeight: number | null }): boolean {
  if (input.focusedField) return true;
  if (input.visualHeight == null) return false;
  return input.layoutHeight - input.visualHeight > 150;
}

function useKeyboardFlag() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport ?? null;
    const update = () => {
      const open = keyboardOpen({
        focusedField: raisesKeyboard(document.activeElement),
        layoutHeight: window.innerHeight,
        visualHeight: viewport ? viewport.height : null,
      });
      if (open) root.dataset.keyboard = "open";
      else delete root.dataset.keyboard;
    };
    // focusout fires before the next element gets focus; check after it settles.
    const later = () => window.setTimeout(update, 0);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", later);
    viewport?.addEventListener("resize", update);
    update();
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", later);
      viewport?.removeEventListener("resize", update);
      delete root.dataset.keyboard;
    };
  }, []);
}

export function MobileNavigation({ signedIn: signedInProp }: { signedIn?: boolean } = {}) {
  const path = usePathname();
  const session = useSession();
  const signedIn = signedInProp ?? session.signedIn;
  useKeyboardFlag();
  return (
    <nav className="mobile-tabs" aria-label="Primary">
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
        const watchlist = href === "/ballot" && signedIn;
        const destination = watchlist ? "/account" : href;
        const current = currentTab(path, destination) ?? (watchlist && currentTab(path, href) ? "location" : undefined);
        return (
          <Link key={href} href={destination} aria-current={current}>
            <Icon size={21} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
