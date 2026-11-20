const allowedHostnames = new Set(["voter.naijei.com"]);

const staticPaths = new Set([
  "/", "/about", "/accessibility", "/account", "/admin", "/admin/brand",
  "/admin/checks", "/admin/corrections", "/admin/features", "/agent", "/ask",
  "/ballot", "/candidates", "/chat", "/contact", "/finance", "/finance/example",
  "/map", "/measures", "/measures/example-kentucky", "/news", "/officeholders",
  "/polls", "/privacy", "/sign-in", "/sources", "/states", "/terms", "/updates",
]);

// Emit only known route labels. Dynamic values can also come from invalid URLs.
const routeTemplates: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/(account|users?|alerts?)\/.+$/, "/$1/:id"],
  [/^\/candidates\/[^/]+$/, "/candidates/:id"],
  [/^\/races\/[^/]+(\/compare)?$/, "/races/:id$1"],
  [/^\/states\/[^/]+(\/issues)?$/, "/states/:state$1"],
  [/^\/measures\/[^/]+\/[^/]+$/, "/measures/:state/:kind"],
  [/^\/measures\/[^/]+$/, "/measures/:state"],
  [/^\/finance\/committees\/[^/]+$/, "/finance/committees/:id"],
];

export function isGoatCounterHostname(hostname: string): boolean {
  return allowedHostnames.has(hostname);
}

export function normalizeGoatCounterPath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (staticPaths.has(path)) return path;

  for (const [pattern, template] of routeTemplates) {
    if (pattern.test(path)) return path.replace(pattern, template);
  }
  return "/:unknown";
}
