"use client";

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { Icon } from "../Icon";
import { openReport, toast, type ReportTarget } from "./device";

/** The corrections API stores at most 2,000 characters, including the source and page lines. */
const MAX_NOTE = 2000;

export function ReportButton({ candidateId, className = "linkbtn", children }: { candidateId?: string; className?: string; children?: React.ReactNode }) {
  return (
    <button className={className} type="button" onClick={() => openReport({ candidateId })}>
      {children ?? (
        <>
          <Icon name="flag" size="sm" />
          Report an error
        </>
      )}
    </button>
  );
}

export function ReportDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const whatRef = useRef<HTMLTextAreaElement>(null);
  const [target, setTarget] = useState<ReportTarget>({});
  const [page, setPage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = ((event as CustomEvent).detail ?? {}) as ReportTarget;
      setTarget(detail);
      setError(null);
      setPage(`${document.title.replace(/ · THE VOTE$/, "")} (${location.pathname})`);
      document.querySelectorAll<HTMLElement>("[popover]").forEach((pop) => {
        if (pop.matches(":popover-open")) pop.hidePopover();
      });
      dialogRef.current?.showModal();
      setTimeout(() => whatRef.current?.focus(), 30);
    };
    window.addEventListener("tv:report", onOpen);
    return () => window.removeEventListener("tv:report", onOpen);
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const what = String(data.get("what") ?? "").trim();
    if (!what) {
      whatRef.current?.focus();
      return;
    }
    const source = String(data.get("source") ?? "").trim();
    const note = [what, source ? `Source: ${source}` : null, `Page: ${page}`].filter(Boolean).join("\n");
    if (note.length > MAX_NOTE) {
      setError(`Too long by ${note.length - MAX_NOTE} characters. Shorten the description or the source link.`);
      whatRef.current?.focus();
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetch(withBasePath("/api/corrections"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateId: target.candidateId, note, website: String(data.get("website") ?? "") }),
      });
      const body = (await response.json().catch(() => ({}))) as { stored?: boolean; message?: string };
      if (!response.ok || body.stored === false) {
        setError(body.message ?? "Couldn't send. Try again.");
        return;
      }
      form.reset();
      dialogRef.current?.close();
      toast("Report sent. Thank you.");
    } catch {
      setError("Couldn't send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <dialog
      className="sheet report"
      ref={dialogRef}
      aria-labelledby="rp-h"
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div className="sh-h">
        <h2 id="rp-h">Report an error</h2>
        <button className="icon-btn" type="button" aria-label="Close" onClick={() => dialogRef.current?.close()}>
          <Icon name="close" />
        </button>
      </div>
      <form className="sh-b" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="rp-what">What is wrong?</label>
          <textarea ref={whatRef} className="input" id="rp-what" name="what" rows={4} required maxLength={1500} placeholder="For example: the filing date for this candidate is wrong…" />
        </div>
        <div className="field">
          <label htmlFor="rp-src">Link to a source that shows the right information (optional)</label>
          <input className="input" id="rp-src" name="source" type="url" inputMode="url" autoComplete="off" placeholder="https://" />
        </div>
        <div className="field">
          <label htmlFor="rp-page">Page</label>
          <input className="input" id="rp-page" readOnly value={page} />
        </div>
        <div className="hp" aria-hidden="true">
          <label htmlFor="rp-web">Website</label>
          <input id="rp-web" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        {error ? (
          <p className="err-msg" role="alert">
            {error}
          </p>
        ) : null}
        <div className="row">
          <button className="btn primary" type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send report"}
          </button>
          <button className="btn ghost" type="button" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
