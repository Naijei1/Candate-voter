/**
 * Optional path prefix for a future CloudFront mount at /voter.
 * Leave unset (or empty) for the voter.naijei.com subdomain.
 * Next.js applies this prefix to routes, Link, and static assets.
 */
export function normalizeBasePath(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export function basePathFromEnv(
  env?: Record<string, string | undefined>,
): string {
  return normalizeBasePath(env ? env.NEXT_PUBLIC_BASE_PATH : process.env.NEXT_PUBLIC_BASE_PATH);
}

/** App-relative path with the configured base path, for raw hrefs and curl. */
export function withBasePath(
  path: string,
  env?: Record<string, string | undefined>,
): string {
  const base = basePathFromEnv(env);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
