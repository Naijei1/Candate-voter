/**
 * Ask reads this after a page view. The page always queries Dynamo, then
 * stores the row here. Ask on the same process reuses that row, so the
 * first "who is running" does not open a second cold read.
 * Memory-repository tests do not use this store.
 */

const TTL_MS = 60_000;
const MAX_KEYS = 200;

type Entry = { at: number; value: unknown };

const store = new Map<string, Entry>();

export function rosterCacheKey(kind: "race" | "candidates" | "watermark", id = ""): string {
  return id ? `${kind}:${id}` : kind;
}

export function primeRosterRead(key: string, value: unknown): void {
  store.set(key, { at: Date.now(), value: structuredClone(value) });
  if (store.size <= MAX_KEYS) return;
  const oldest = store.keys().next().value;
  if (oldest) store.delete(oldest);
}

export function dropRosterRead(key: string): void {
  store.delete(key);
}

export async function rosterRead<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return structuredClone(hit.value) as T;
  const value = await load();
  primeRosterRead(key, value);
  return structuredClone(value) as T;
}
