const HOST = /^[a-z0-9.-]+(?::\d{1,5})?$/i;
const PRODUCTION_ORIGIN = "https://voter.naijei.com";

/**
 * Origin for docs and curl examples. Falls back to the public site when the
 * host header is missing or contains characters that do not belong in a host.
 */
export function originFromHost(input: {
  host: string | null;
  proto: string | null;
}): string {
  const host = input.host?.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!HOST.test(host)) return PRODUCTION_ORIGIN;

  const forwarded = input.proto?.split(",")[0]?.trim().toLowerCase() ?? "";
  const proto =
    forwarded === "http" || forwarded === "https"
      ? forwarded
      : host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https";
  return `${proto}://${host}`;
}

export function originFromRequest(request: Request): string {
  const url = new URL(request.url);
  return originFromHost({
    host: request.headers.get("x-forwarded-host") ?? url.host,
    proto:
      request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", ""),
  });
}
