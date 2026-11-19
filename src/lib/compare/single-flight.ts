/**
 * Run `work` once per key at a time. Callers that arrive while it is still
 * running get the same promise; the key is freed when it settles.
 */
export function singleFlight<T>(pending: Map<string, Promise<T>>, key: string, work: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) return existing;
  const call = work().finally(() => pending.delete(key));
  pending.set(key, call);
  return call;
}
