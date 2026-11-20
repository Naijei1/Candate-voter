const FRESH_MS = 10 * 60_000;
const MAX_AGE_MS = 6 * 60 * 60_000;
const RETRY_MS = 60_000;
const MAX_KEYS = 32;

type Entry<T> = {
  good?: { value: T; at: number };
  pending?: Promise<T>;
  failure?: { error: unknown; retryAt: number };
};

export function memoizeRead<K, T>(read: (key: K) => Promise<T>, logError: (error: unknown) => void, now = Date.now) {
  const entries = new Map<K, Entry<T>>();
  return async (key: K): Promise<T> => {
    const entry = entries.get(key) ?? {};
    entries.delete(key);
    entries.set(key, entry);
    for (const [oldKey, oldEntry] of entries) {
      if (entries.size <= MAX_KEYS) break;
      if (oldKey !== key && !oldEntry.pending) entries.delete(oldKey);
    }

    const time = now();
    const good = entry.good;
    const age = good ? time - good.at : Infinity;
    if (good && age < FRESH_MS) return good.value;
    if (!entry.pending && (!entry.failure || time >= entry.failure.retryAt)) {
      entry.pending = Promise.resolve().then(() => read(key)).then((value) => {
        entry.good = { value, at: now() };
        entry.failure = undefined;
        return value;
      }).catch((error: unknown) => {
        if (!entry.failure) logError(error);
        entry.failure = { error, retryAt: now() + RETRY_MS };
        throw error;
      }).finally(() => {
        entry.pending = undefined;
      });
      // A background refresh may have no caller waiting for its result.
      void entry.pending.catch(() => {});
    }
    if (good && age < MAX_AGE_MS) return good.value;
    if (entry.pending) return entry.pending;
    throw entry.failure?.error;
  };
}
