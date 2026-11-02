export const MEDIA_SLOTS = ["logo", "hero", "founder"] as const;
export type MediaSlot = (typeof MEDIA_SLOTS)[number];

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_MEDIA_BYTES = 2_000_000;

export function parseMediaSlot(value: unknown): MediaSlot | null {
  if (value === "logo" || value === "hero" || value === "founder") return value;
  return null;
}

export function extensionForType(contentType: string): string | null {
  return TYPES[contentType] ?? null;
}

export function isBrandKey(slot: MediaSlot, key: string): boolean {
  return key.startsWith(`brand/${slot}/`) && !key.includes("..") && key.length < 180;
}

export function clampCrop(input: {
  width: number;
  height: number;
  x: number;
  y: number;
  size: number;
}): { x: number; y: number; size: number } {
  const limit = Math.max(1, Math.min(input.width, input.height));
  const size = Math.min(Math.max(1, Math.floor(input.size)), limit);
  const x = Math.min(Math.max(0, Math.floor(input.x)), Math.max(0, input.width - size));
  const y = Math.min(Math.max(0, Math.floor(input.y)), Math.max(0, input.height - size));
  return { x, y, size };
}
