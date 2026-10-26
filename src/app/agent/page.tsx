import type { Metadata } from "next";
import { headers } from "next/headers";
import { AgentApiDocs, type FreshnessState } from "@/components/AgentApiDocs";
import { basePathFromEnv } from "@/lib/base-path";
import { originFromHost } from "@/lib/api/public-origin";
import { logReadError, readWatermark } from "@/lib/data/read";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Agent API",
  description:
    "Read-only JSON API for stored federal races, candidates, Form 2 filings, and ingest freshness.",
};

export default async function AgentPage() {
  const headerList = await headers();
  const origin = originFromHost({
    host: headerList.get("x-forwarded-host") ?? headerList.get("host"),
    proto: headerList.get("x-forwarded-proto"),
  });

  return (
    <AgentApiDocs
      origin={origin}
      basePath={basePathFromEnv()}
      freshness={await loadFreshness()}
    />
  );
}

async function loadFreshness(): Promise<FreshnessState> {
  try {
    const watermark = await readWatermark();
    return { ok: true, watermark };
  } catch (error) {
    logReadError("getWatermark", error);
    return { ok: false };
  }
}
