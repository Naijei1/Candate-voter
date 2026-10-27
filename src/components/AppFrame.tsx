"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { YearNavigation } from "@/components/YearNavigation";

export function AppFrame({ cycles, children }: { cycles: number[]; children: ReactNode }) {
  useVisualViewport();
  const pathname = usePathname();
  useChromeHeight(pathname);
  const frame = pathname === "/" ? (
      <>
        <SiteHeader cycles={cycles} overlay />
        <main id="main" className="map-main">
          {children}
        </main>
      </>
    ) : (
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
  return <YearNavigation>{frame}</YearNavigation>;
}

/** Header height includes the iOS status bar, so the Ask sheet and ZIP sit below it. */
function useChromeHeight(pathname: string) {
  useEffect(() => {
    const header = document.querySelector("header");
    if (!(header instanceof HTMLElement)) return;
    const root = document.documentElement;
    const apply = () => {
      const shift = window.visualViewport?.offsetTop ?? 0;
      const rect = header.getBoundingClientRect();
      const safe = safeAreaTop();
      const headerBottom = Math.ceil(rect.bottom + shift);
      const block = Math.max(headerBottom, Math.ceil(safe + 40));
      if (block > 0) root.style.setProperty("--chrome-block", `${block}px`);

      const zip = document.querySelector(".zip-slot");
      if (zip instanceof HTMLElement && zip.getClientRects().length > 0) {
        const zipBottom = Math.ceil(zip.getBoundingClientRect().bottom + shift + 8);
        const cap = Math.round((window.visualViewport?.height ?? window.innerHeight) * 0.46);
        const clearance = Math.min(Math.max(zipBottom, block + 8), Math.max(cap, block + 8));
        root.style.setProperty("--map-clearance", `${clearance}px`);
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    const zip = document.querySelector(".zip-slot");
    if (zip instanceof HTMLElement) observer.observe(zip);
    const main = document.getElementById("main");
    const mutations = new MutationObserver(() => {
      const nextZip = document.querySelector(".zip-slot");
      if (nextZip instanceof HTMLElement) observer.observe(nextZip);
      requestAnimationFrame(apply);
    });
    if (main) mutations.observe(main, { childList: true, subtree: true });
    window.addEventListener("resize", apply);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", apply);
    viewport?.addEventListener("scroll", apply);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", apply);
      viewport?.removeEventListener("resize", apply);
      viewport?.removeEventListener("scroll", apply);
    };
  }, [pathname]);
}

function safeAreaTop(): number {
  const probe = document.getElementById("safe-top-probe") ?? document.createElement("div");
  if (!probe.isConnected) {
    probe.id = "safe-top-probe";
    probe.style.cssText =
      "position:fixed;top:0;left:0;height:env(safe-area-inset-top,0px);pointer-events:none;visibility:hidden;";
    document.body.appendChild(probe);
  }
  return probe.getBoundingClientRect().height;
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
