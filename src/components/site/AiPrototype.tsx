"use client";

import { useState } from "react";
import { AI_EXAMPLES } from "@/content/pilot";
import { StatusMark } from "@/components/site/StatusMark";

export function AiPrototype() {
  const [noted, setNoted] = useState(false);
  return (
    <section className="card" aria-labelledby="ask-race" data-testid="ai-prototype">
      <h2 id="ask-race">Ask about this race</h2>
      <p>
        <StatusMark kind="preview" />
        Prototype. This panel does not look up records and does not call a model. The examples
        below show the answer format. They are not facts about the candidates on this page.
      </p>
      <ul className="section">
        {AI_EXAMPLES.map((example) => (
          <li key={example.id}>
            <h3>{example.prompt}</h3>
            <p>
              <strong>{example.kind}. </strong>
              {example.body}
            </p>
            <p>Source: {example.source}</p>
          </li>
        ))}
      </ul>
      <button className="btn btn-ghost" type="button" onClick={() => setNoted(true)}>
        Report an error
      </button>
      {noted ? (
        <p role="status">
          Noted on this page only. The report was not sent.
        </p>
      ) : null}
      <p>
        Questions about stored FEC filings use a separate assistant on the{" "}
        <a href="/sources">sources page</a>.
      </p>
    </section>
  );
}
