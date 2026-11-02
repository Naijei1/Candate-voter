"use client";

import { useState } from "react";
import { StatusMark } from "@/components/site/StatusMark";
import type { AskExample } from "@/lib/site/ask-examples";

export function AskPanel({ examples }: { examples: readonly AskExample[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="ask-desktop">
        <AskBody examples={examples} />
      </div>
      <div className="ask-mobile">
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
            <AskBody examples={examples} />
          </div>
        ) : null}
      </div>
    </>
  );
}

function AskBody({ examples }: { examples: readonly AskExample[] }) {
  const [noted, setNoted] = useState(false);
  return (
    <section data-testid="ai-prototype">
      <h2>Ask about this race</h2>
      <p>
        <StatusMark kind="preview" hint="Examples only. This does not look up the race." />
        Not a lookup.
      </p>
      <ul className="plain-list">
        {examples.map((example) => (
          <li key={example.prompt}>
            <strong>{example.prompt}</strong>
            <p>
              {example.kind}. {example.body}
            </p>
            <p>
              {example.sample ? <StatusMark kind="sample" /> : null}
              {example.href ? (
                <a href={example.href}>{example.sourceLabel}</a>
              ) : (
                example.sourceLabel
              )}
              {" · "}
              {example.date}
            </p>
          </li>
        ))}
      </ul>
      <button className="btn btn-ghost" type="button" onClick={() => setNoted(true)}>
        Report an error
      </button>
      {noted ? <p role="status">Not sent.</p> : null}
    </section>
  );
}
