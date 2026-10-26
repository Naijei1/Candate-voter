import type { NextConfig } from "next";

/**
 * Optional path prefix for a future CloudFront mount at /voter.
 * Leave unset (or empty) for the voter.naijei.com subdomain MVP.
 * Next.js applies this prefix to routes, Link, and static assets.
 */
function normalizeBasePath(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  // SSR on Amplify Hosting compute. Do not set `output: "export"`.
  // The data layer is server-side only. Keep the AWS SDK external so server
  // components can read DynamoDB without bundling it for the browser.
  serverExternalPackages: [
    "@aws-sdk/client-dynamodb",
    "@aws-sdk/lib-dynamodb",
  ],
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
};

export default nextConfig;
