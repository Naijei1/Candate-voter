import type { Metadata, Viewport } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import { Suspense } from "react";
import { GoatCounter } from "@/components/site/GoatCounter";
import { MobileNavigation } from "@/components/site/MobileNavigation";
import { ServiceWorker } from "@/components/site/ServiceWorker";
import { SiteFooter, SiteHeader } from "@/components/tv/Chrome";
import { THEME_SCRIPT } from "@/components/tv/client/ThemeToggle";
import { brand } from "@/content/brand";
import { withBasePath } from "@/lib/base-path";
import { PRODUCTION_ORIGIN } from "@/lib/api/public-origin";
import "./globals.css";

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--tv-serif",
  display: "swap",
});
const sans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--tv-sans",
  display: "swap",
});

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1628" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(withBasePath("/"), PRODUCTION_ORIGIN),
  alternates: { canonical: "./" },
  title: {
    default: "THE VOTE: your elections, all in one place",
    template: `%s · ${brand.name}`,
  },
  description: "Kentucky’s 2026 elections: candidates, comparisons, dates and money, each with its source.",
  applicationName: brand.name,
  appleWebApp: { title: brand.name },
  icons: { apple: [{ url: withBasePath("/icons/apple-touch-icon.png"), sizes: "180x180" }] },
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: brand.name,
    description: brand.description,
    locale: "en_US",
    images: [{ url: "/video/vote-hero.jpg", alt: "Voters marking ballots." }],
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
  return (
    <html lang="en" data-theme="light" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ServiceWorker />
        <Suspense fallback={null}>
          <GoatCounter />
        </Suspense>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <MobileNavigation />
      </body>
    </html>
  );
}
