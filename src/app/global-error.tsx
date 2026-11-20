"use client";

import ErrorBoundary from "./error";
import "./globals.css";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="page-main"><ErrorBoundary reset={reset} /></main>
      </body>
    </html>
  );
}
