"use client";

import { useState, type FormEvent } from "react";
import { postChatMessage } from "@/lib/chat/browser";
import { formatInstant } from "@/lib/format";
import type { ChatSource } from "@/lib/chat/types";

const PROMPTS = [
  "Who has filed to run?",
  "What is the latest filing?",
  "What did they say in the latest debate?",
] as const;

type Answer =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "answer"; text: string; sources: ChatSource[]; noEvidence: boolean }
  | { state: "error"; text: string };

export function AskPanel({
  raceId,
  cycle,
  state,
}: {
  raceId: string;
  cycle: number | null;
  state: string | null;
}) {
  return (
    <>
      <div className="ask-desktop">
        <AskBody raceId={raceId} cycle={cycle} state={state} />
      </div>
      <div className="ask-mobile">
        <MobileAsk raceId={raceId} cycle={cycle} state={state} />
      </div>
    </>
  );
}

function MobileAsk(props: { raceId: string; cycle: number | null; state: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-ghost" type="button" onClick={() => setOpen(true)}>
        Ask about this race
      </button>
      {open ? (
        <div className="ask-sheet" role="dialog" aria-label="Ask about this race">
          <div className="actions">
            <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <AskBody {...props} />
        </div>
      ) : null}
    </>
  );
}

function AskBody({
  raceId,
  cycle,
  state,
}: {
  raceId: string;
  cycle: number | null;
  state: string | null;
}) {
  const [answer, setAnswer] = useState<Answer>({ state: "idle" });
  const [report, setReport] = useState("");
  const [reportNote, setReportNote] = useState<string | null>(null);

  async function ask(message: string) {
    setAnswer({ state: "loading" });
    const result = await postChatMessage({
      body: {
        message,
        raceId,
        ...(cycle != null ? { cycle, year: cycle } : {}),
        ...(state ? { state } : {}),
      },
    });
    if (!result.ok) {
      setAnswer({
        state: "error",
        text: result.kind === "timeout" ? "That took too long. Try again." : "Could not look that up. Try again.",
      });
      return;
    }
    const noEvidence = result.refused || result.sources.length === 0;
    setAnswer({
      state: "answer",
      text: noEvidence ? "Nothing stored answers that. Try who has filed to run." : plain(result.answer_markdown),
      sources: result.sources,
      noEvidence,
    });
  }

  async function sendReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportNote(null);
    const response = await fetch("/api/corrections", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ note: report, raceId }),
    });
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    setReportNote(body?.message ?? "Not saved.");
    if (response.ok) setReport("");
  }

  return (
    <section data-testid="ai-prototype">
      <h2>Ask about this race</h2>
      <p className="hint">Answers use stored candidacy filings only. If there is no filing, it will say so.</p>
      <div className="actions">
        {PROMPTS.map((prompt) => (
          <button key={prompt} className="btn btn-ghost" type="button" onClick={() => ask(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      {answer.state === "loading" ? <p role="status">Looking up filings…</p> : null}
      {answer.state === "error" ? <p role="alert">{answer.text}</p> : null}
      {answer.state === "answer" ? (
        <div>
          <p>{answer.text}</p>
          {answer.sources.length > 0 ? (
            <ul className="plain-list">
              {answer.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url}>{source.title}</a>
                  {" · "}
                  {formatInstant(source.as_of) ?? source.as_of}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <form className="finder" onSubmit={sendReport}>
        <label htmlFor={`report-${raceId}`}>
          Report an error
          <textarea id={`report-${raceId}`} value={report} onChange={(event) => setReport(event.target.value)} rows={3} />
        </label>
        <button className="btn btn-ghost" type="submit">
          Send report
        </button>
        {reportNote ? <p role="status">{reportNote}</p> : null}
      </form>
    </section>
  );
}

function plain(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
