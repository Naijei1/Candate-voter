"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function AppFrame({ cycles, children }: { cycles: number[]; children: ReactNode }) {
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
      <div className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-6xl flex-col px-4 sm:px-6">
        <main id="main" className="flex-1 py-8">
          {children}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
