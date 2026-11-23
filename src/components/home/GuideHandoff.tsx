"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const KEYS = ["step", "zip", "district", "race"] as const;

/** Old guide links land on the home URL. The ballot page owns those fields. */
export function GuideHandoff() {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forward = new URLSearchParams();
    for (const key of KEYS) {
      const value = params.get(key);
      if (value) forward.set(key, value);
    }
    if ([...forward.keys()].length > 0) router.replace(`/ballot?${forward.toString()}`);
  }, [router]);
  return null;
}
