"use client";

import { useState, type FormEvent } from "react";
import { withBasePath } from "@/lib/base-path";

export function CandidateCorrection({ candidateId, raceId }: { candidateId: string; raceId?: string }) {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function sendReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setSending(true);
    setStatus("");
    try {
      const response = await fetch(withBasePath("/api/corrections"), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ candidateId, raceId, note: fields.get("note"), website: fields.get("website") }),
      });
      if (response.ok) form.reset();
      setStatus(response.ok ? "Saved for review." : "Couldn't send. Try again.");
    } catch {
      setStatus("Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <details id="report-an-error">
      <summary className="action-link">Report an error</summary>
      <form className="finder" onSubmit={sendReport}>
        <input className="sr-only" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
        <label htmlFor="profile-correction">What needs correcting?</label>
        <textarea id="profile-correction" name="note" required maxLength={2000} rows={3} />
        <button className="btn btn-ghost" type="submit" disabled={sending}>Send</button>
        <p role="status">{status}</p>
      </form>
    </details>
  );
}
