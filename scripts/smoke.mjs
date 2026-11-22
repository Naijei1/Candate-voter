const target = process.argv[2];
if (!target || !URL.canParse(target) || !["http:", "https:"].includes(new URL(target).protocol)) {
  console.error("Usage: node scripts/smoke.mjs https://voter.naijei.com");
  process.exit(1);
}

const origin = new URL(target).origin;
const pages = [
  "/", "/states/ky", "/finance", "/candidates", "/races/2026-senate-KY", "/races/2026-senate-KY/compare",
  "/ask", "/sources", "/privacy", "/terms", "/api/health", "/robots.txt", "/sitemap.xml",
];
const redirects = {
  "/states": "/states/ky",
  "/polls": "/",
  "/chat": "/ask",
  "/agent": "/sources",
};
const checks = [
  ...pages.map((path) => ({ path, status: 200 })),
  ...Object.entries(redirects).map(([path, destination]) => ({ path, destination })),
  { path: "/api/v1/freshness", status: 401 },
];

const rows = await Promise.all(checks.map(async ({ path, status, destination }) => {
  const failures = [];
  try {
    const response = await fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(20_000) });
    await response.body?.cancel();
    if (destination) {
      const location = response.headers.get("location");
      if (![301, 302, 303, 307, 308].includes(response.status) || !location ||
          new URL(location, origin).href !== new URL(destination, origin).href) {
        failures.push(`expected redirect to ${destination}`);
      }
    } else if (response.status !== status) {
      failures.push(`expected ${status}`);
    }
    // Redirects are same-origin hops; check security headers on the pages they land on.
    for (const header of destination ? [] : ["content-security-policy", "strict-transport-security", "x-frame-options"]) {
      if (!response.headers.get(header)) failures.push(`missing ${header}`);
    }
    if (response.headers.has("x-powered-by")) failures.push("x-powered-by present");
    return { path, status: response.status, result: failures.join(", ") || "OK" };
  } catch (error) {
    return { path, status: "—", result: error.message };
  }
}));

console.table(rows);
if (rows.some((row) => row.result !== "OK")) process.exitCode = 1;
