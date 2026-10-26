import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:outline-2 focus:outline-accent"
        >
          Skip to content
        </a>
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4">
          <SiteHeader />
          <main id="main" className="flex-1 py-8">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
