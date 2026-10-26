import type { NextConfig } from "next";
import { normalizeBasePath } from "./src/lib/base-path";

/**
 * Optional path prefix for a future CloudFront mount at /voter.
 * Leave unset (or empty) for the voter.naijei.com subdomain MVP.
 * Next.js applies this prefix to routes, Link, and static assets.
 */

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  // SSR on Amplify Hosting compute. Do not set `output: "export"`.
  // The data layer is server-side only. Keep the AWS SDK external so server
  // components can read DynamoDB without bundling it for the browser.
  serverExternalPackages: [
    "@aws-sdk/client-dynamodb",
    "@aws-sdk/client-bedrock-runtime",
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
