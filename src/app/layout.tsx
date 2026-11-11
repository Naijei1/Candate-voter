import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import { AskProvider } from "@/components/chat/AskProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PlaceSync } from "@/components/site/PlaceSync";
import { brand } from "@/content/brand";
import { cyclesFromEnv } from "@/lib/data/cycles";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
});
const display = localFont({
  src: [
    { path: "../fonts/big-shoulders-latin.woff2", weight: "700", style: "normal" },
    { path: "../fonts/big-shoulders-latin.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description:
    "Find a contest, compare candidates on the same fields, and see the source of each fact.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cycles = cyclesFromEnv();
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} ${display.variable}`}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AskProvider cycles={cycles}>
          <Suspense fallback={null}>
            <PlaceSync />
          </Suspense>
          <SiteHeader />
          <main id="main" className="page-main">
            {children}
          </main>
          <SiteFooter />
        </AskProvider>
      </body>
    </html>
  );
}
