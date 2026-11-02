/** Pull CD120 codes out of a Census geocoder JSON body. No address is read. */

export function congressionalDistricts(body: unknown): string[] {
  const matches = (body as { result?: { addressMatches?: unknown[] } })?.result?.addressMatches;
  if (!Array.isArray(matches)) return [];
  const found: string[] = [];
  for (const match of matches) {
    const layers = (match as { geographies?: Record<string, unknown> })?.geographies ?? {};
    for (const [name, rows] of Object.entries(layers)) {
      if (!/congressional district/i.test(name) || !Array.isArray(rows)) continue;
      for (const row of rows) {
        const record = row as { CD120?: unknown; BASENAME?: unknown };
        const code = typeof record.CD120 === "string" ? record.CD120 : null;
        const basename = typeof record.BASENAME === "string" ? record.BASENAME.padStart(2, "0") : null;
        const text = code && /^\d{2}$/.test(code) ? code : basename && /^\d{2}$/.test(basename) ? basename : "";
        if (text) found.push(text);
      }
    }
  }
  return found;
}
