import type { NextConfig } from "next";
import { normalizeBasePath } from "./src/lib/base-path";

/**
 * Optional path prefix for a future CloudFront mount at /voter.
 * Leave unset (or empty) for the voter.naijei.com subdomain MVP.
 * Next.js applies this prefix to routes, Link, and static assets.
 */

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      ["/states", "/states/ky"],
      ["/states/:state((?!ky(?:/|$))[^/]+)", "/states/ky"],
      ["/states/:state/issues", "/states/ky"],
      ["/polls", "/"],
      ["/measures/:path*", "/"],
      ["/agent", "/sources"],
      ["/chat", "/ask"],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  async headers() {
    const evalSource = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
    const bucket = process.env.CANDATE_MEDIA_BUCKET?.trim() ?? "";
    const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
    // The admin uploads directly to a presigned URL for the configured media bucket.
    const uploadOrigin = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) && /^[a-z0-9-]+$/.test(region)
      ? ` https://${bucket}.s3.${region}.amazonaws.com`
      : "";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' https://gc.zgo.at${evalSource}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self'",
      `connect-src 'self' https://*.goatcounter.com${uploadOrigin}`,
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.amazoncognito.com",
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      ...["photos", "video", "geo"].map((directory) => ({
        source: `/${directory}/:path*`,
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      })),
    ];
  },
  // SSR on Amplify Hosting compute. Do not set `output: "export"`.
  // The data layer is server-side only. Keep the AWS SDK external so server
  // components can read DynamoDB without bundling it for the browser.
  serverExternalPackages: [
    "@aws-sdk/client-dynamodb",
    "@aws-sdk/client-bedrock-runtime",
    "@aws-sdk/client-cognito-identity-provider",
    "@aws-sdk/client-s3",
    "@aws-sdk/lib-dynamodb",
    "@aws-sdk/s3-request-presigner",
    "aws-jwt-verify",
  ],
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
};

export default nextConfig;
