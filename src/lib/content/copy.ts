/** Public site copy. Empty fields render as awaiting content. Do not invent text. */

export const AWAITING_CONTENT = "Awaiting content";

export const COPY_FIELDS = [
  "mission",
  "founderBio",
  "ownership",
  "funding",
  "affiliations",
  "editorialStandards",
  "correctionsPolicy",
  "contactMethod",
] as const;

export type CopyField = (typeof COPY_FIELDS)[number];

export type SiteCopy = Record<CopyField, string | null> & {
  logoKey: string | null;
  heroKey: string | null;
  founderKey: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export const COPY_LABELS: Record<CopyField, string> = {
  mission: "Mission",
  founderBio: "Founder bio",
  ownership: "Ownership",
  funding: "Funding",
  affiliations: "Affiliations",
  editorialStandards: "Editorial standards",
  correctionsPolicy: "Corrections policy",
  contactMethod: "Contact method",
};

const MAX_COPY = 2000;

export function emptySiteCopy(): SiteCopy {
  return {
    mission: null,
    founderBio: null,
    ownership: null,
    funding: null,
    affiliations: null,
    editorialStandards: null,
    correctionsPolicy: null,
    contactMethod: null,
    logoKey: null,
    heroKey: null,
    founderKey: null,
    updatedAt: null,
    updatedBy: null,
  };
}

export function publishedCopy(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  return text ? text : null;
}

export function readCopyField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > MAX_COPY) return null;
  return text;
}

export function copyFromItem(item: Record<string, unknown> | null): SiteCopy {
  const copy = emptySiteCopy();
  if (!item) return copy;
  for (const field of COPY_FIELDS) copy[field] = publishedCopy(typeof item[field] === "string" ? item[field] : null);
  copy.logoKey = mediaKey(item.logoKey);
  copy.heroKey = mediaKey(item.heroKey);
  copy.founderKey = mediaKey(item.founderKey);
  copy.updatedAt = typeof item.updatedAt === "string" ? item.updatedAt : null;
  copy.updatedBy = typeof item.updatedBy === "string" ? item.updatedBy : null;
  return copy;
}

function mediaKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("brand/") || value.includes("..")) return null;
  return value;
}
