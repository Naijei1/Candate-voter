"use client";

import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { DARK_BAR, LIGHT_BAR } from "../theme-script";

const THEME_EVENT = "tv-theme";

function current(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function apply(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = theme === "dark" ? DARK_BAR : LIGHT_BAR;
    meta.removeAttribute("media");
  });
}

/** Labeled switch for dark mode. The words say what it does; the icon is decoration. */
export function ThemeToggle({ className = "thm" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const sync = () => setTheme(current());
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const flip = () => {
    const next = current() === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem("tv-theme", next);
    } catch {
      // The choice still applies to this page.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button className={className} type="button" role="switch" aria-checked={theme === "dark"} onClick={flip}>
      <Icon name={theme === "dark" ? "sun" : "moon"} size="sm" />
      Dark mode
    </button>
  );
}
