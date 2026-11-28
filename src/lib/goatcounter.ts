const allowedHostnames = new Set(["voter.naijei.com", "main.d253xhq1uabld3.amplifyapp.com"]);

export const cityPageviewEndpoint = "https://admin.naijei.com/api/city";

const staticPaths = new Set([
  "/", "/about", "/accessibility", "/account", "/admin", "/admin/brand",
  "/admin/checks", "/admin/corrections", "/admin/features", "/ask",
  "/ballot", "/candidates", "/contact", "/finance", "/finance/example",
  "/map", "/news", "/officeholders",
  "/privacy", "/sign-in", "/sources", "/states/ky", "/terms", "/updates",
]);

// Emit only known route labels. Dynamic values can also come from invalid URLs.
const routeTemplates: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/(account|users?|alerts?)\/.+$/, "/$1/:id"],
  [/^\/candidates\/[^/]+$/, "/candidates/:id"],
  [/^\/races\/[^/]+(\/compare)?$/, "/races/:id$1"],
  [/^\/finance\/committees\/[^/]+$/, "/finance/committees/:id"],
];

export function isGoatCounterHostname(hostname: string): boolean {
  return allowedHostnames.has(hostname);
}

export function normalizeGoatCounterPath(pathname: string, basePath = ""): string {
  const appPath = basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
    ? pathname.slice(basePath.length)
    : pathname;
  const path = appPath.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (staticPaths.has(path)) return path;

  for (const [pattern, template] of routeTemplates) {
    if (pattern.test(path)) return path.replace(pattern, template);
  }
  return "/:unknown";
}

type CityPageviewBrowser = {
  location: Pick<Location, "hostname" | "protocol">;
  navigator: { doNotTrack?: string | null; globalPrivacyControl?: boolean };
  doNotTrack?: string | null;
};

export function sendCityPageview(path: string, browser: CityPageviewBrowser): void {
  const { location, navigator, doNotTrack } = browser;
  if (location.protocol !== "https:" || !isGoatCounterHostname(location.hostname)) return;
  if (navigator.doNotTrack === "1" || doNotTrack === "1" || navigator.globalPrivacyControl === true) return;

  void fetch(cityPageviewEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true,
  }).catch(() => {});
}
