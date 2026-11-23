"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useId, useRef } from "react";
import { dayLabel } from "@/lib/format";

/** Opens a source card in place. Click or keyboard only. */
export function SourcePeek({
  name,
  url,
  date,
  excerpt,
}: {
  name: string;
  url: string;
  date?: string | null;
  excerpt?: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const when = date && /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : null;
  return (
    <>
      <button type="button" className="source-peek-btn" onClick={() => ref.current?.showModal()}>
        {name}
      </button>
      <dialog
        ref={ref}
        className="source-peek"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === ref.current) ref.current?.close();
        }}
      >
        <p id={titleId} className="source-peek-name">{name}</p>
        {when ? <p className="hint"><time dateTime={when}>{dayLabel(when)}</time></p> : null}
        {excerpt ? <p>{excerpt}</p> : null}
        <p><a href={url}>Open source</a></p>
        <form method="dialog">
          <button className="btn btn-ghost" type="submit">Close</button>
        </form>
      </dialog>
    </>
  );
}
