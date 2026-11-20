import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import { AskProvider } from "@/components/chat/AskProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { GoatCounter } from "@/components/site/GoatCounter";
import { MobileNavigation } from "@/components/site/MobileNavigation";
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
  themeColor: "#0b1a2a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Absolute base for social preview images. `SITE_ORIGIN` overrides the live Amplify address. */
const siteOrigin = process.env.SITE_ORIGIN?.trim() || "https://main.d253xhq1uabld3.amplifyapp.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: brand.name,
    description: brand.description,
    locale: "en_US",
    images: [{ url: "/video/vote-hero.jpg", alt: "People voting at a polling place." }],
  },
  twitter: {
    card: "summary_large_image",
    title: brand.name,
    description: brand.description,
    images: ["/video/vote-hero.jpg"],
  },
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
        <Suspense fallback={null}>
          <GoatCounter />
        </Suspense>
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
          <MobileNavigation />
        </AskProvider>
      </body>
    </html>
  );
}
