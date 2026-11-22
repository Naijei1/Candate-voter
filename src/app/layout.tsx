import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import { AskProvider } from "@/components/chat/AskProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { GoatCounter } from "@/components/site/GoatCounter";
import { MobileNavigation } from "@/components/site/MobileNavigation";
import { ServiceWorker } from "@/components/site/ServiceWorker";
import { PlaceSync } from "@/components/site/PlaceSync";
import { currentUser } from "@/lib/auth/session";
import { brand } from "@/content/brand";
import { cyclesFromEnv } from "@/lib/data/cycles";
import { withBasePath } from "@/lib/base-path";
import { PRODUCTION_ORIGIN } from "@/lib/api/public-origin";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-editorial",
  display: "swap",
});
const display = localFont({
  src: [
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

export const metadata: Metadata = {
  metadataBase: new URL(withBasePath("/"), PRODUCTION_ORIGIN),
  alternates: { canonical: "./" },
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  icons: { apple: [{ url: withBasePath("/icons/apple-touch-icon.png"), sizes: "180x180" }] },
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: brand.name,
    description: brand.description,
    locale: "en_US",
    images: [{ url: "/video/vote-hero.jpg", alt: "Fields in the Knobs region of Kentucky." }],
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
      <body className={`${sourceSans.variable} ${newsreader.variable} ${display.variable}`}>
        <ServiceWorker />
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
          <WatchlistNavigation />
        </AskProvider>
      </body>
    </html>
  );
}

async function WatchlistNavigation() {
  return <MobileNavigation signedIn={Boolean(await currentUser())} />;
}
