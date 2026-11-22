"use client";

import { useState, type FormEvent } from "react";
import { withBasePath } from "@/lib/base-path";

export function CorrectionForm({ source, candidateId }: { source: string | null; candidateId?: string }) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const note = String(data.get("note") ?? "").trim();
    if (!note) {
      setStatus("Enter a correction.");
      return;
    }
    setPending(true);
    setStatus("");
    try {
      const response = await fetch(withBasePath("/api/corrections"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidateId,
          website: data.get("website"),
          note: source ? `${note}\n\n${source}` : note,
        }),
      });
      if (response.ok) {
        form.reset();
        setStatus("Correction sent.");
      } else {
        setStatus(response.status === 429 ? "Too many reports. Try again later." : "Couldn’t send the correction. Try again.");
      }
    } catch {
      setStatus("Couldn’t send the correction. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="finder" method="post" action={withBasePath("/api/corrections")} aria-labelledby="corrections" onSubmit={submit}>
      <input className="sr-only" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label htmlFor="correction-note">What needs correcting?</label>
      <textarea id="correction-note" name="note" rows={4} required maxLength={2000 - (source ? source.length + 2 : 0)} />
      <button className="btn btn-navy" type="submit" disabled={pending}>Send correction</button>
      <p role="status">{status}</p>
    </form>
  );
}
