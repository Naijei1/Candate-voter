// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React from "react";
import { StorageNotice } from "@/components/StorageNotice";
import type { IngestWatermark } from "@/lib/types";

const WATERMARK_FIELDS = [
  "source",
  "lastLoadTimestamp",
  "lastRunAt",
  "lastStatus",
  "lastError",
  "pagesFetched",
  "filingsUpserted",
  "skipped",
  "updatedAt",
] as const;

export type FreshnessState =
  | { ok: true; watermark: IngestWatermark | null }
  | { ok: false };

type AgentApiDocsProps = {
  origin: string;
  basePath: string;
  freshness: FreshnessState;
};

export function AgentApiDocs({ origin, basePath, freshness }: AgentApiDocsProps) {
  const root = `${origin}${basePath}`;
  const freshnessUrl = `${root}/api/v1/freshness`;
  const racesUrl = `${root}/api/v1/races?cycle=2026&state=CA&office=senate`;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Agent API</h1>
        <p className="max-w-2xl text-base leading-7 text-muted">
          Read-only JSON for the races, candidates, and FEC Form 2 filings
          already stored for the public pages. Each record includes its source
          link and write time. Party is the affiliation code on the filing.
        </p>
        <p className="max-w-2xl text-base leading-7 text-muted">
          The API does not score, rank, endorse, or advise a vote, and it has
          no write methods. The browser chat route below does not use this
          key. Other agents call <code>/api/v1</code> with a key.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="coverage-heading">
        <h2 id="coverage-heading" className="text-xl font-semibold tracking-tight">
          Coverage
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-base leading-7">
          <li>
            <code>GET /api/v1/races</code> — federal contests. Optional filters:{" "}
            <code>cycle</code>, <code>state</code>, <code>office</code>. Omit{" "}
            <code>cycle</code> to use the same year window as the public index.
            Pages of up to 100 races, ordered by <code>raceId</code>. The
            default page size is 100. An even year includes every apportioned
            House district, including districts with no filing (
            <code>empty: true</code>), and a Senate race when that class is
            up. At-large is district <code>00</code>. Off-cycle Senate seats
            are not added.
          </li>
          <li>
            <code>GET /api/v1/races/{"{raceId}"}</code> — one race and its
            candidates, alphabetical by display name. A ballot stub with no
            stored row returns the race and an empty candidate list. The same
            normalized name
            is one row. <code>multiFilingNote</code> names each party once and
            lists the other FEC ids. <code>alternateFilings</code> keeps those
            source links.
          </li>
          <li>
            <code>GET /api/v1/candidates/{"{candidateId}"}</code> — one candidate
            and the race on that row.
          </li>
          <li>
            <code>GET /api/v1/candidates/{"{candidateId}"}/filings</code> — Form
            2 filings, newest FEC load timestamp first.
          </li>
          <li>
            <code>GET /api/v1/lookup/zip?zip=40502&amp;year=2026</code> — ZIP
            to state, House district(s), and the Senate race id.{" "}
            <code>cycle</code> is an alias of <code>year</code>. A ZIP that
            spans districts returns each one. Unknown ZIPs are 404.
          </li>
          <li>
            <code>GET /api/v1/freshness</code> — ingest watermark for{" "}
            <code>fec-efile-form2</code>.
          </li>
          <li>
            <code>POST /api/chat</code> — same-origin browser chat. No API key.
            One buffered JSON body (<code>answer_markdown</code>,{" "}
            <code>sources</code>, <code>refused</code>, <code>mode</code>).{" "}
            <code>refused: true</code> is still HTTP 200. <code>mode</code> is{" "}
            <code>factual</code> or <code>alignment</code>.
          </li>
        </ul>
        <p className="max-w-2xl text-base leading-7 text-muted">
          Records are FEC Form 2 electronic filings only, not a full ballot.
          Race list (the index, and a state filter) and race detail include
          top-level <code>refreshedAt</code> for the page-level data-refreshed
          banner. It is the ISO-8601 ingest cursor time, or null, and{" "}
          <code>coverage.refreshedAt</code> is the same value.{" "}
          <code>coverage.house</code> is <code>districtsWithFilings</code> of{" "}
          <code>districtsTotal</code>. That object is the plain scoreboard.
          Filter with <code>state</code> for one state row, including a
          zero. The unfiltered list adds a row per state that already has a
          House filing. Empty district stubs stay in <code>races</code> and
          are not counted in <code>districtsWithFilings</code>. There is no
          per-race candidate count.{" "}
          <code>GET /api/v1/freshness</code> repeats
          that scope and the ingest watermark. Chat asks which state or race
          when “who is running” has no contest. It soft-refuses voting advice.
          An explicit viewpoint question sets <code>mode</code> to{" "}
          <code>alignment</code>, cites stored filings, and does not recommend
          a vote. The table has no vote or position text, so that answer says
          the comparison cannot be made yet. <code>CANDATE_CHAT_ALIGNMENT</code>{" "}
          defaults to on.
        </p>
        <p className="text-sm leading-6 text-muted">
          The same records are on the{" "}
          <a
            href={`${basePath}/`}
            className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            public race index
          </a>
          . HTML pages do not require a key.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="auth-heading">
        <h2 id="auth-heading" className="text-xl font-semibold tracking-tight">
          Authentication
        </h2>
        <p className="max-w-2xl text-base leading-7 text-muted">
          Every <code>/api/v1</code> request sends the key in{" "}
          <code>Authorization: Bearer</code> or <code>X-Api-Key</code>. When
          both are present, both must match. A missing or wrong key returns
          401. The key is issued by the site operator and is not shown on this
          page. Examples use the placeholder <code>YOUR_API_KEY</code>.
        </p>
        <Example label="Bearer token">{`curl -sS \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "${freshnessUrl}"`}</Example>
        <Example label="X-Api-Key header">{`curl -sS \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  "${racesUrl}"`}</Example>
        <Example label="ZIP to races">{`curl -sS \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "${root}/api/v1/lookup/zip?zip=40502&year=2026"`}</Example>
        <Example label="Browser chat, no API key">{`curl -sS -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Which Senate races are stored for California in 2026?","cycle":2026}' \\
  "${root}/api/chat"`}</Example>
      </section>

      <section className="space-y-3" aria-labelledby="freshness-heading">
        <h2 id="freshness-heading" className="text-xl font-semibold tracking-tight">
          Ingest freshness
        </h2>
        <p className="max-w-2xl text-base leading-7 text-muted">
          The cursor below is the <code>fec-efile-form2</code> watermark in the
          table. <code>lastLoadTimestamp</code> is the inclusive FEC load time
          already safe to re-read. <code>lastRunAt</code> is when the worker
          last ran. <code>lastStatus</code> is <code>running</code>,{" "}
          <code>success</code>, or <code>error</code>.
        </p>
        <Freshness freshness={freshness} />
      </section>

      <section className="space-y-3" aria-labelledby="spec-heading">
        <h2 id="spec-heading" className="text-xl font-semibold tracking-tight">
          OpenAPI
        </h2>
        <p className="text-base leading-7">
          <a
            href={`${basePath}/openapi.yaml`}
            className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            OpenAPI document
          </a>
          <span className="text-muted"> · </span>
          <a
            href={`${basePath}/llms.txt`}
            className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            llms.txt
          </a>
        </p>
      </section>
    </div>
  );
}

function Freshness({ freshness }: { freshness: FreshnessState }) {
  if (!freshness.ok) {
    return (
      <StorageNotice tone="error">
        The ingest watermark could not be loaded from the table.
      </StorageNotice>
    );
  }

  if (!freshness.watermark) {
    return (
      <div className="space-y-3">
        <StorageNotice>
          No fec-efile-form2 watermark is stored yet.
        </StorageNotice>
        <Example label="watermark">{JSON.stringify({ watermark: null }, null, 2)}</Example>
      </div>
    );
  }

  const watermark = freshness.watermark;
  return (
    <div className="space-y-4">
      <dl className="divide-y divide-line rounded-lg border border-line bg-card">
        {WATERMARK_FIELDS.map((field) => (
          <div key={field} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr]">
            <dt className="font-mono text-sm text-muted">{field}</dt>
            <dd className="font-mono text-sm break-all">
              {formatField(watermark[field])}
            </dd>
          </div>
        ))}
      </dl>
      <Example label="JSON">{JSON.stringify({ watermark }, null, 2)}</Example>
    </div>
  );
}

function formatField(value: string | number | null): string {
  if (value == null) return "null";
  return String(value);
}

function Example({ label, children }: { label: string; children: string }) {
  return (
    <pre
      aria-label={label}
      className="overflow-x-auto rounded-lg border border-line bg-card p-4 text-sm leading-6"
    >
      <code>{children}</code>
    </pre>
  );
}
