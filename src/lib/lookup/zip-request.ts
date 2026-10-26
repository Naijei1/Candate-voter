import { getZipLookup } from "@/lib/api/handlers";
import { liveApiDeps } from "@/lib/api/deps";
import { withBasePath } from "@/lib/base-path";
import {
  normalizeZip,
  parseZipLookup,
  type ZipLookupResult,
} from "@/lib/lookup/zip-view";

/** Matches the Census budget (about 7s) with a little room for the UI. */
export const ZIP_LOOKUP_TIMEOUT_MS = 8_000;

export function buildZipLookupRequest(input: {
  zip: string;
  year: number;
  origin: string;
  env?: Record<string, string | undefined>;
}): { ok: true; request: Request } | { ok: false; reason: "bad_request"; message: string } {
  const zip = normalizeZip(input.zip);
  if (!zip) return { ok: false, reason: "bad_request", message: "Enter a 5-digit ZIP code." };
  if (!Number.isInteger(input.year) || input.year < 1980 || input.year > 2100) {
    return { ok: false, reason: "bad_request", message: "Enter a valid election year." };
  }
  const env = input.env ?? process.env;
  const url = new URL(withBasePath("/api/v1/lookup/zip", env), input.origin);
  url.searchParams.set("zip", zip);
  url.searchParams.set("year", String(input.year));
  const headers = new Headers({ accept: "application/json" });
  const key = env.CANDATE_API_KEY?.trim() ?? "";
  if (key) {
    headers.set("authorization", `Bearer ${key}`);
    headers.set("x-api-key", key);
  }
  return { ok: true, request: new Request(url, { method: "GET", headers }) };
}

/**
 * In-process `GET /api/v1/lookup/zip?zip=&year=`.
 * The browser never sees the API key. `year` is sent; `cycle` is not.
 */
export async function requestZipLookup(input: {
  zip: string;
  year: number;
  origin: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  signal?: AbortSignal;
  callHandler?: (request: Request) => Promise<Response>;
}): Promise<ZipLookupResult> {
  const built = buildZipLookupRequest(input);
  if (!built.ok) return { ok: false, reason: "bad_request", message: built.message };
  if (input.signal?.aborted) throw abortError();

  const env = input.env ?? process.env;
  const timeoutMs = input.timeoutMs ?? ZIP_LOOKUP_TIMEOUT_MS;
  const call =
    input.callHandler ??
    ((request: Request) => getZipLookup(request, liveApiDeps(env)));

  try {
    const response = await withTimeout(call(built.request), timeoutMs, input.signal);
    return await readZipResponse(response);
  } catch (error) {
    if (isAbortError(error)) {
      if (input.signal?.aborted) throw error;
      return { ok: false, reason: "timeout", message: null };
    }
    return { ok: false, reason: "unavailable", message: null };
  }
}

async function readZipResponse(response: Response): Promise<ZipLookupResult> {
  if (response.status === 200) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, reason: "bad_response", message: null };
    }
    const payload = parseZipLookup(body);
    if (!payload) return { ok: false, reason: "bad_response", message: null };
    return { ok: true, payload };
  }
  const message = await readMessage(response);
  if (response.status === 404) return { ok: false, reason: "not_found", message };
  if (response.status === 400) return { ok: false, reason: "bad_request", message };
  return { ok: false, reason: "unavailable", message: null };
}

async function readMessage(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" && body.message.trim() ? body.message.trim() : null;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  void promise.catch(() => {});
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
    clock.id = setTimeout(() => finish(() => reject(timeoutError())), timeoutMs);
    signal?.addEventListener("abort", onAbort);
    promise.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    );
  });
}

function timeoutError(): Error {
  const error = new Error("timeout");
  error.name = "TimeoutError";
  return error;
}

function abortError(): Error {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
