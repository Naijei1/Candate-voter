import type { FecForm2Filing, FecForm2Page, FecForm2Query } from "./types";

export const FEC_API_BASE_URL = "https://api.open.fec.gov/v1";
export const FORM2_PATH = "/efile/form2/";

/** Pages per run. 500 pages is 50,000 filings, well above a full federal pass. */
export const MAX_PAGES_SAFETY = 500;

const MAX_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 120_000;

export class FecApiError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "FecApiError";
    this.status = status;
    this.retryable = retryable;
  }
}

export type FecClientOptions = {
  apiKey: string;
  baseUrl?: string;
  minDelayMs?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
};

export type FetchedForm2Page = {
  page: number;
  pages: number;
  perPage: number;
  results: FecForm2Filing[];
};

/**
 * OpenFEC client for electronic Form 2 filings.
 *
 * Endpoint: `GET https://api.open.fec.gov/v1/efile/form2/`
 * Docs: https://api.open.fec.gov/developers/
 *
 * The API key is the `api_key` query parameter (api.data.gov). `DEMO_KEY` is
 * the public demo key. A successful response on 2026-10-26 reported
 * `x-ratelimit-limit: 10` for DEMO_KEY. A free registered key allows
 * 1,000 calls per hour. Each call returns at most 100 rows.
 *
 * `min_load_timestamp` is inclusive (`column >= value` in openFEC) and
 * accepts a calendar date (`YYYY-MM-DD`), not a time. This client sends
 * the date portion of the stored cursor, so the boundary day is read again.
 * This client retries 429 and 5xx with exponential backoff and honors
 * `Retry-After` up to two minutes. A longer window is raised so the job
 * can save its cursor and run again on the next schedule.
 */
export class FecClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly minDelayMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleepImpl: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly random: () => number;

  constructor(options: FecClientOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) {
      throw new FecApiError(
        "Set FEC_API_KEY. OpenFEC requires an api.data.gov key. DEMO_KEY is the public demo key and shares a very small hourly limit. A free key is at https://api.data.gov/signup/.",
        0,
        false,
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? FEC_API_BASE_URL).replace(/\/+$/, "");
    this.minDelayMs = options.minDelayMs ?? 250;
    this.fetchImpl = options.fetch ?? fetch;
    this.sleepImpl = options.sleep ?? delay;
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
  }

  async *iterateForm2(
    query: FecForm2Query & { maxPages?: number } = {},
  ): AsyncGenerator<FetchedForm2Page> {
    const perPage = clampPerPage(query.perPage);
    const maxPages = Math.min(query.maxPages ?? MAX_PAGES_SAFETY, MAX_PAGES_SAFETY);
    let page = 1;
    let yielded = 0;

    while (yielded < maxPages) {
      const body = await this.getForm2Page({ ...query, page, perPage });
      const results = Array.isArray(body.results) ? body.results : [];
      if (results.length === 0) return;

      const pages =
        typeof body.pagination?.pages === "number" ? body.pagination.pages : page;
      yield { page, pages, perPage, results };
      yielded += 1;

      if (yielded >= maxPages) return;
      if (page >= pages) return;

      page += 1;
      if (this.minDelayMs > 0) await this.sleepImpl(this.minDelayMs);
    }
  }

  async getForm2Page(query: FecForm2Query): Promise<FecForm2Page> {
    const url = this.buildForm2Url(query);
    return this.fetchJson(url);
  }

  buildForm2Url(query: FecForm2Query): URL {
    const url = new URL(`${this.baseUrl}${FORM2_PATH}`);
    const perPage = clampPerPage(query.perPage);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("sort", "load_timestamp");
    url.searchParams.set("sort_nulls_last", "true");
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(query.page ?? 1));
    for (const office of query.offices ?? ["H", "S", "P"]) {
      url.searchParams.append("candidate_office", office);
    }
    if (query.minLoadTimestamp) {
      url.searchParams.set(
        "min_load_timestamp",
        fecLoadDate(query.minLoadTimestamp),
      );
    }
    return url;
  }

  private async fetchJson(url: URL): Promise<FecForm2Page> {
    const path = `${url.pathname}${redactQuery(url)}`;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          headers: {
            accept: "application/json",
            "user-agent": "candate-voter-ingest/0.1",
          },
        });
      } catch {
        if (attempt === MAX_ATTEMPTS - 1) {
          throw new FecApiError(
            `FEC request failed before a response (${path})`,
            0,
            true,
          );
        }
        await this.sleepImpl(this.backoffMs(attempt, null));
        continue;
      }

      if (response.ok) {
        return (await response.json()) as FecForm2Page;
      }

      const detail = await readErrorDetail(response);
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS - 1) {
        throw new FecApiError(
          `FEC request failed with HTTP ${response.status} (${path})${detail}`,
          response.status,
          retryable,
        );
      }

      const retryAfter = retryAfterMs(
        response.headers.get("retry-after"),
        this.now(),
      );
      const wait = this.backoffMs(attempt, retryAfter);
      if (wait > MAX_BACKOFF_MS) {
        throw new FecApiError(
          `FEC rate limit window is longer than ${MAX_BACKOFF_MS / 1000}s (HTTP ${response.status}, ${path}). The ingest cursor is saved; run again after the window resets.`,
          response.status,
          true,
        );
      }
      await this.sleepImpl(wait);
    }

    throw new FecApiError(`FEC request failed (${path})`, 0, true);
  }

  private backoffMs(attempt: number, retryAfter: number | null): number {
    const exponential = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt);
    const base = retryAfter == null ? exponential : Math.max(retryAfter, 0);
    const jitter = Math.floor(this.random() * 250);
    return base + jitter;
  }
}

export function fecApiKeyFromEnv(
  env: Record<string, string | undefined> = process.env,
): string {
  const key = env.FEC_API_KEY?.trim() ?? "";
  if (!key) {
    throw new FecApiError(
      "Set FEC_API_KEY. OpenFEC requires an api.data.gov key. DEMO_KEY is the public demo key and shares a very small hourly limit. A free key is at https://api.data.gov/signup/.",
      0,
      false,
    );
  }
  return key;
}

function clampPerPage(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return 100;
  return Math.min(100, Math.max(1, Math.floor(value)));
}

/** OpenFEC rejects datetimes on this filter. Keep the calendar date. */
export function fecLoadDate(timestamp: string): string {
  const date = timestamp.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new FecApiError(
      "min_load_timestamp must start with YYYY-MM-DD",
      0,
      false,
    );
  }
  return date;
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const parsed = JSON.parse(text) as { message?: unknown };
    if (typeof parsed.message !== "string") return "";
    const message = parsed.message.replace(/\s+/g, " ").trim().slice(0, 300);
    return message ? `: ${message}` : "";
  } catch {
    return "";
  }
}

function redactQuery(url: URL): string {
  const params = new URLSearchParams(url.search);
  if (params.has("api_key")) params.set("api_key", "redacted");
  const query = params.toString();
  return query ? `?${query}` : "";
}

function retryAfterMs(header: string | null, now: number): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - now);
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
