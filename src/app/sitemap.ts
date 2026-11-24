import type { MetadataRoute } from "next";
import { PRODUCTION_ORIGIN } from "@/lib/api/public-origin";
import { normalizeBasePath } from "@/lib/base-path";
import { kyBallotSeed } from "@/lib/site/ky-ballot";
import { enabledStates, statePath } from "@/lib/states";

export default function sitemap(): MetadataRoute.Sitemap {
  const prefix = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
  const { races, candidates } = kyBallotSeed();
  const paths = [
    "/", "/accessibility", "/ask", "/ballot", "/candidates", "/contact", "/search",
    "/finance", "/news", "/officeholders", "/privacy", "/sources", ...enabledStates().map(statePath), "/terms",
    ...races.flatMap(({ raceId }) => [`/races/${raceId}`, `/races/${raceId}/compare`]),
    ...candidates.map(({ candidateId }) => `/candidates/${candidateId}`),
  ];
  return [...new Set(paths)].map((path) => ({ url: `${PRODUCTION_ORIGIN}${prefix}${path}` }));
}
