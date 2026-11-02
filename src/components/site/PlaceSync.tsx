"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  PLACE_STORAGE_KEY,
  emptyPlace,
  hasPlace,
  mergePlace,
  readPlaceParams,
  sanitizePlace,
} from "@/lib/place/selection";

export function PlaceSync() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const fromUrl = readPlaceParams(params);
    const stored = readStored();
    const pathState = /^\/states\/([a-z]{2})(?:\/|$)/.exec(pathname)?.[1]?.toUpperCase() ?? null;
    const fromPath = pathState ? { ...emptyPlace(), state: pathState } : emptyPlace();
    if (hasPlace(fromUrl) || pathState) {
      writeStored(mergePlace(stored, mergePlace(fromPath, fromUrl)));
    }
    if (!hasPlace(fromUrl) && hasPlace(stored)) {
      const next = new URLSearchParams(params.toString());
      const place = mergePlace(stored, fromPath);
      if (place.state) next.set("state", place.state);
      if (place.year) next.set("year", String(place.year));
      if (place.zip) next.set("zip", place.zip);
      if (place.district) next.set("district", place.district);
      const query = next.toString();
      if (query && query !== params.toString()) router.replace(`${pathname}?${query}`);
      return;
    }
    if (pathState && !params.get("state")) {
      const next = new URLSearchParams(params.toString());
      next.set("state", pathState);
      router.replace(`${pathname}?${next.toString()}`);
    }
  }, [pathname, params, router]);

  return null;
}

function readStored() {
  try {
    return sanitizePlace(JSON.parse(localStorage.getItem(PLACE_STORAGE_KEY) ?? "null"));
  } catch {
    return emptyPlace();
  }
}

function writeStored(place: ReturnType<typeof sanitizePlace>) {
  localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify(place));
}
