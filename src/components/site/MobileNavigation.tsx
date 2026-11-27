"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/tv/Icon";
import { PLACE_EVENT, placeHref, readPlace } from "@/components/tv/client/device";

export const MOBILE_TABS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/ballot", label: "My races", icon: "ballot" },
  { href: "/news", label: "News Feed", icon: "news" },
  { href: "/finance", label: "Finances", icon: "money" },
  { href: "/ask", label: "Ask", icon: "ask" },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: IconName }>;

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

export function MobileNavigation() {
  const path = usePathname();
  const [races, setRaces] = useState("/ballot");
  useKeyboardFlag();
  useEffect(() => {
    const sync = () => setRaces(placeHref(readPlace()));
    sync();
    window.addEventListener(PLACE_EVENT, sync);
    return () => window.removeEventListener(PLACE_EVENT, sync);
  }, []);
  return (
    <nav className="tabbar" aria-label="Sections">
      {MOBILE_TABS.map(({ href, label, icon }) => (
        <Link key={href} href={href === "/ballot" ? races : href} aria-current={currentTab(path, href)}>
          <Icon name={icon} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
