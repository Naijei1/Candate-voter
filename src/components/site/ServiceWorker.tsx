"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { withBasePath } from "@/lib/base-path";

export function ServiceWorker() {
  const path = usePathname();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let active = true;
    void navigator.serviceWorker.register(withBasePath("/sw.js"))
      .then(() => navigator.serviceWorker.ready)
      .then(({ active: worker }) => {
        if (!active) return;
        worker?.postMessage({ type: "visit", resources: performance.getEntriesByType("resource").map(({ name }) => name) });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [path]);
  return null;
}
