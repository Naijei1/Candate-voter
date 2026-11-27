"use client";

import { useState } from "react";

/**
 * A complete first clause, then the rest of the stored text behind "More".
 * `context` names what expands, for screen readers.
 */
export function More({ short, rest, context, className = "mo" }: { short: string; rest: string; context: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={className}>
      <span>{short}</span>
      <span className="mo-rest" hidden={!open}>
        {rest}
      </span>{" "}
      <button className="more" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="mo-l">{open ? "Less" : "More"}</span>
        <span className="sr"> of {context}</span>
      </button>
    </span>
  );
}
