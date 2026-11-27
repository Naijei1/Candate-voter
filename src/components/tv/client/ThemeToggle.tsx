"use client";

import { useEffect, useState } from "react";
import { Icon } from "../Icon";

const LIGHT_BAR = "#FFFFFF";
const DARK_BAR = "#0B1628";

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

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(current());
  }, []);

  const flip = () => {
    const next = current() === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem("tv-theme", next);
    } catch {
      // The choice still applies to this page.
    }
    setTheme(next);
  };

  return (
    <button className="icon-btn" type="button" onClick={flip} aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}>
      <span className="t-l">
        <Icon name="moon" />
      </span>
      <span className="t-d">
        <Icon name="sun" />
      </span>
    </button>
  );
}

/** Runs before paint so the first frame uses the saved or system theme. */
export const THEME_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search).get('theme');if(q==='dark'||q==='light'){localStorage.setItem('tv-theme',q)}var t=q||localStorage.getItem('tv-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++){m[i].content=t==='dark'?'${DARK_BAR}':'${LIGHT_BAR}';m[i].removeAttribute('media')}}catch(e){}})();`;
