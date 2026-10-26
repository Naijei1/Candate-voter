import type { CandidatePreview, RaceCandidatesResult } from "@/lib/landing/candidates";

/** Client wait for the state-panel server action. A healthy read is well under a second. */
export const CANDIDATE_LOAD_TIMEOUT_MS = 10_000;

export type CandidateCacheEntry =
  | { ok: true; candidates: CandidatePreview[] }
  | { ok: false };

export class CandidateLoadTimeout extends Error {
  constructor() {
    super("timeout");
    this.name = "CandidateLoadTimeout";
  }
}

type LoadCandidates = (raceIds: string[]) => Promise<RaceCandidatesResult>;

/**
 * Resolve the panel load, or a failed result if it hangs or throws.
 * Abort is the caller's cancellation (state change) and is rethrown so the
 * caller can ignore it instead of flashing an error for a race the visitor left.
 */
export async function loadCandidatesForRacesWithTimeout(
  raceIds: string[],
  options: {
    load: LoadCandidates;
    timeoutMs?: number;
    signal?: AbortSignal;
  },
): Promise<RaceCandidatesResult> {
  if (options.signal?.aborted) throw abortError();
  const timeoutMs = options.timeoutMs ?? CANDIDATE_LOAD_TIMEOUT_MS;
  const pending = Promise.resolve().then(() => options.load(raceIds));
  // A late rejection after the deadline must not become an unhandled rejection.
  void pending.catch(() => {});

  try {
    return await withDeadline(pending, timeoutMs, options.signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return {
      ok: false,
      error: error instanceof CandidateLoadTimeout ? "timeout" : "unavailable",
    };
  }
}

/**
 * Every requested id leaves the loading state. A successful payload that
 * omits an id is a failure for that id, not a reason to keep "Loading…".
 */
export function applyCandidateLoad(
  prev: ReadonlyMap<string, CandidateCacheEntry>,
  requestedIds: readonly string[],
  result: RaceCandidatesResult,
): Map<string, CandidateCacheEntry> {
  const next = new Map(prev);
  if (!result.ok) {
    for (const id of requestedIds) next.set(id, { ok: false });
    return next;
  }
  const returned = new Map(result.races.map((group) => [group.raceId, group]));
  for (const id of requestedIds) {
    const group = returned.get(id);
    if (!group || "error" in group) next.set(id, { ok: false });
    else next.set(id, { ok: true, candidates: group.candidates });
  }
  return next;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function withDeadline<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    let settled = false;
    const clock: { id?: ReturnType<typeof setTimeout> } = {};
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      if (clock.id) clearTimeout(clock.id);
      signal?.removeEventListener("abort", onAbort);
      settle();
    };
    const onAbort = () => finish(() => reject(abortError()));
    clock.id = setTimeout(() => finish(() => reject(new CandidateLoadTimeout())), timeoutMs);
    signal?.addEventListener("abort", onAbort);
    promise.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    );
  });
}

function abortError(): Error {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}
