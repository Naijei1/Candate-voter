import type { MetadataRoute } from "next";
import { PRODUCTION_ORIGIN } from "@/lib/api/public-origin";
import { normalizeBasePath } from "@/lib/base-path";

export default function robots(): MetadataRoute.Robots {
  const prefix = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
  return {
    rules: {
      userAgent: "*",
      allow: `${prefix}/`,
      disallow: ["/admin", "/api/", "/account"].map((path) => `${prefix}${path}`),
    },
    sitemap: `${PRODUCTION_ORIGIN}${prefix}/sitemap.xml`,
  };
}
