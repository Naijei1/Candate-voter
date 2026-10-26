import type { Metadata } from "next";
import Script from "next/script";
import { AskDrawer, AskProvider } from "@/components/AskChrome";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { cyclesFromEnv } from "@/lib/data/cycles";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Candate",
    template: "%s · Candate",
  },
  description:
    "Nonpartisan tracker for federal President, Senate, and House races. Pages cite stored public filings with sources and timestamps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Script id="candate-motion" strategy="beforeInteractive">
          {`try{if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("motion-ok")}catch(e){}`}
        </Script>
        <AskProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:outline-2 focus:outline-accent"
          >
            Skip to content
          </a>
          <SiteHeader cycles={cyclesFromEnv()} />
          <div className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-6xl flex-col px-4 sm:px-6">
            <main id="main" className="flex-1 py-8">
              {children}
            </main>
            <SiteFooter />
          </div>
          <AskDrawer />
        </AskProvider>
      </body>
    </html>
  );
}
