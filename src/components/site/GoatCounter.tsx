"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { normalizeBasePath } from "@/lib/base-path";
import { isGoatCounterHostname, normalizeGoatCounterPath } from "@/lib/goatcounter";

type Pageview = { path: string; title: string; event: false; referrer: string };

declare global {
  interface Window {
    goatcounter?: {
      no_onload: boolean;
      allow_local: boolean;
      count?: (pageview: Pageview) => void;
    };
  }
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export function GoatCounter() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const lastPath = useRef<string | null>(null);
  const pending = useRef<string[]>([]);

  useEffect(() => {
    const { hostname, protocol } = window.location;
    if (protocol === "file:" || !isGoatCounterHostname(hostname)) return;
    window.goatcounter ??= { no_onload: true, allow_local: false };
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled || pathname == null) return;
    const browserPath = window.location.pathname;
    const appPath = basePath && (browserPath === basePath || browserPath.startsWith(`${basePath}/`))
      ? browserPath.slice(basePath.length)
      : browserPath;
    const path = normalizeGoatCounterPath(appPath);
    if (lastPath.current !== path) {
      lastPath.current = path;
      pending.current.push(path);
    }

    const counter = window.goatcounter;
    if (!ready || !counter?.count) return;
    for (const queuedPath of pending.current.splice(0)) {
      counter.count({ path: queuedPath, title: "THE VOTE", event: false, referrer: "" });
    }
  }, [enabled, pathname, ready]);

  if (!enabled) return null;
  return (
    <Script
      src="https://gc.zgo.at/count.js"
      strategy="afterInteractive"
      data-goatcounter="https://naijei-voter.goatcounter.com/count"
      referrerPolicy="no-referrer"
      onReady={() => setReady(true)}
    />
  );
}
