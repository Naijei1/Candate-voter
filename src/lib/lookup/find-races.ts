"use server";

import { headers } from "next/headers";
import { originFromHost } from "@/lib/api/public-origin";
import { requestZipLookup } from "@/lib/lookup/zip-request";
import type { ZipLookupResult } from "@/lib/lookup/zip-view";

/** Find Senate and House races for a ZIP. Calls `GET /api/v1/lookup/zip` in process. */
export async function findRacesByZip(zip: string, year: number): Promise<ZipLookupResult> {
  const incoming = await headers();
  const origin = originFromHost({
    host: incoming.get("x-forwarded-host") ?? incoming.get("host"),
    proto: incoming.get("x-forwarded-proto"),
  });
  return requestZipLookup({ zip, year, origin });
}
