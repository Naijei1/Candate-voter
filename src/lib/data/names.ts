/**
 * Display normalization for names taken from FEC Form 2.
 * Placeholder tokens such as "n/a" are removed. All-caps words become
 * title case. Tokens that already mix case, and short all-caps initials,
 * are left as written.
 */

const PLACEHOLDER = /^(?:n\/a|n\.a\.)$/i;
const INITIALS = /^(?:[A-Za-z]\.){1,4}$/;
const ROMAN = /^(?:II|III|IV|VI|VII|VIII|IX|XI|XII)$/i;
const SUFFIX: Record<string, string> = { JR: "Jr.", SR: "Sr." };
const PARTICLES = new Set([
  "van",
  "von",
  "de",
  "da",
  "di",
  "del",
  "della",
  "la",
  "le",
  "du",
]);

/** True when the whole string is only an n/a placeholder. */
export function isPlaceholderName(value: string | null | undefined): boolean {
  const text = value?.trim() ?? "";
  if (!text) return false;
  const tokens = text.split(/\s+/).filter((token) => token.length > 0);
  return tokens.length > 0 && tokens.every((token) => isPlaceholderToken(token));
}

/**
 * Readable display name, or null when nothing remains after placeholder removal.
 */
export function normalizePersonName(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  if (!text) return null;
  const tokens = text.split(/\s+/).flatMap((token, index, all) => {
    const normalized = normalizeToken(token, index, all.length);
    return normalized ? [normalized] : [];
  });
  if (tokens.length === 0) return null;
  return tokens.join(" ");
}

/** Filed string with placeholder tokens removed and the same casing rules. */
export function normalizeFiledName(value: string | null | undefined): string | null {
  return normalizePersonName(value);
}

function isPlaceholderToken(token: string): boolean {
  const core = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
  return PLACEHOLDER.test(core);
}

function normalizeToken(token: string, index: number, count: number): string | null {
  const match = /^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/.exec(token);
  if (!match) return null;
  const [, lead, core, trail] = match;
  if (!core) return null;
  if (PLACEHOLDER.test(core)) return null;
  if (core.includes("-")) {
    const parts = core.split("-").flatMap((part) => {
      const normalized = normalizeCore(part, index, count);
      return normalized ? [normalized] : [];
    });
    if (parts.length === 0) return null;
    return `${lead}${parts.join("-")}${trail}`;
  }
  const normalized = normalizeCore(core, index, count);
  if (!normalized) return null;
  return `${lead}${normalized}${trail}`;
}

function normalizeCore(core: string, index: number, count: number): string | null {
  if (!core || PLACEHOLDER.test(core)) return null;
  if (INITIALS.test(core)) return core.toUpperCase();
  if (hasMixedCase(core)) return core;
  if (core.includes("'")) {
    const parts = core.split("'").map((part) => normalizeCore(part, index, count) ?? "");
    const joined = parts.join("'").replace(/^'+|'+$/g, "");
    return joined.length > 0 ? joined : null;
  }
  const letters = core.replace(/[^A-Za-z]/g, "");
  if (ROMAN.test(letters) && letters.length === core.length) return letters.toUpperCase();
  const suffix = SUFFIX[letters.toUpperCase()];
  if (suffix && (core.endsWith(".") || letters.length === core.length)) return suffix;

  const lower = core.toLowerCase();
  if (index > 0 && index < count - 1 && PARTICLES.has(lower)) return lower;
  if (letters.length > 0 && letters.length <= 2 && letters.toUpperCase() === letters) {
    return core.toUpperCase();
  }
  if (/^mc[a-z].+/i.test(lower) && lower.length > 3) {
    return `Mc${lower.charAt(2).toUpperCase()}${lower.slice(3)}`;
  }
  return titleCase(lower);
}

function hasMixedCase(value: string): boolean {
  return /[A-Z]/.test(value) && /[a-z]/.test(value);
}

function titleCase(lower: string): string {
  if (!lower) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
