import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CitationCard } from "../src/components/chat/CitationCard";
import { DataRefreshedBanner } from "../src/components/DataRefreshedBanner";
import { MultiFilingDetails } from "../src/components/MultiFilingDetails";
import { parseChatSuccess } from "../src/lib/chat/ui";

test("data refreshed banner uses the index timestamp and stays quiet when it is missing", () => {
  const shown = renderToStaticMarkup(
    React.createElement(DataRefreshedBanner, { refreshedAt: "2026-10-26T18:48:47.307Z" }),
  );
  assert.match(shown, /Data refreshed/);
  assert.match(shown, /Oct 26, 2026, 2:48\sPM ET/);
  assert.match(shown, /dateTime="2026-10-26T18:48:47.307Z"/);
  assert.equal(renderToStaticMarkup(React.createElement(DataRefreshedBanner, { refreshedAt: null })), "");
  assert.equal(renderToStaticMarkup(React.createElement(DataRefreshedBanner, {})), "");
  assert.equal(
    renderToStaticMarkup(React.createElement(DataRefreshedBanner, { refreshedAt: "   " })),
    "",
  );

  const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  const read = readFileSync(new URL("../src/lib/data/read.ts", import.meta.url), "utf8");
  assert.match(page, /refreshedAt=\{loaded\.refreshedAt\}/);
  assert.match(read, /refreshedAt: await readIndexRefreshedAt\(\)/);
  assert.equal(page.includes("loadRefreshedAt"), false);
});

test("multi-id notes collapse behind the filing count and keep the existing copy", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MultiFilingDetails as React.FC<{ count: number }>,
      { count: 7 },
      React.createElement(
        "p",
        null,
        "Parties filed under multiple FEC ids: Write-in (S6CA01210); Republican (S6CA01111).",
      ),
    ),
  );
  assert.match(html, /<summary[^>]*>7 filings<\/summary>/);
  assert.match(html, /S6CA01210/);
  assert.match(html, /S6CA01111/);
  assert.equal(html.includes("ranking"), false);

  const landing = readFileSync(new URL("../src/components/Landing.tsx", import.meta.url), "utf8");
  const race = readFileSync(new URL("../src/app/races/[raceId]/page.tsx", import.meta.url), "utf8");
  assert.match(landing, /alternateFilingCount \+ 1/);
  assert.match(race, /alternateFilings\.length \+ 1/);
  assert.equal(landing.includes('<p className="text-sm text-muted">{candidate.multiFilingNote}</p>'), false);
  assert.equal(race.includes("<p className=\"mt-1 text-sm leading-6 text-muted\">{candidate.multiFilingNote}</p>"), false);
});

test("Ask citations prefer source as_of and fall back to refreshedAt", () => {
  const parsed = parseChatSuccess({
    answer_markdown: "Stored filings for U.S. Senate, Kentucky.",
    sources: [
      {
        title: "U.S. Senate, Kentucky",
        url: "https://www.fec.gov/data/elections/senate/KY/2026/",
        as_of: "2026-10-26T17:00:00Z",
      },
    ],
    refused: false,
    mode: "factual",
    refreshedAt: "2026-10-26T18:48:47.307Z",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.sources[0]?.title, "U.S. Senate, Kentucky");
  assert.equal(parsed.refreshedAt, "2026-10-26T18:48:47.307Z");
  const html = renderToStaticMarkup(
    React.createElement(CitationCard, {
      source: parsed.sources[0]!,
      refreshedAt: parsed.refreshedAt,
    }),
  );
  assert.match(html, /U\.S\. Senate, Kentucky/);
  assert.match(html, /As of Oct 26, 2026, 1:00\sPM ET/);
  assert.equal(html.includes("2:48"), false);
  assert.equal(html.includes(">https://www.fec.gov"), false);
  assert.equal(html.includes("2026-senate-KY"), false);

  const unknown = renderToStaticMarkup(
    React.createElement(CitationCard, {
      source: { title: "U.S. Senate, Kentucky", url: "/races/2026-senate-KY", as_of: "unknown" },
      refreshedAt: "2026-10-26T18:48:47.307Z",
    }),
  );
  assert.match(unknown, /As of Oct 26, 2026, 2:48\sPM ET/);
});
