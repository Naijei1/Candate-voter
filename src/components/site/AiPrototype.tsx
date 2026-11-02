"use client";

import { useState } from "react";
import { AI_EXAMPLES } from "@/content/pilot";
import { StatusMark } from "@/components/site/StatusMark";

export function AiPrototype() {
  const [noted, setNoted] = useState(false);
  return (
    <section data-testid="ai-prototype">
      <p>
        <StatusMark kind="preview" hint="Examples only. This does not look up the race." />
        Not a lookup.
      </p>
      <ul className="plain-list">
        {AI_EXAMPLES.map((example) => (
          <li key={example.id}>
            <strong>{example.prompt}</strong>
            <span> {example.kind}. {example.body}</span>
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
