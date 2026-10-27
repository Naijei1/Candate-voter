"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function AppFrame({ cycles, children }: { cycles: number[]; children: ReactNode }) {
  useVisualViewport();
  const pathname = usePathname();
  if (pathname === "/") {
    return (
      <>
        <SiteHeader cycles={cycles} overlay />
        <main id="main" className="map-main">
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader cycles={cycles} />
      <div className="page-frame mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6">
        <main id="main" className="flex-1 py-6 sm:py-8">
          {children}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

/** Keeps the ZIP glass in the visual viewport when the iOS keyboard opens. */
function useVisualViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      root.style.setProperty("--vv-top", `${viewport.offsetTop}px`);
      root.style.setProperty("--vv-height", `${viewport.height}px`);
      const keyboard = window.innerHeight - viewport.height > 140;
      root.classList.toggle("keyboard-open", keyboard);
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
      root.classList.remove("keyboard-open");
    };
  }, []);
}
