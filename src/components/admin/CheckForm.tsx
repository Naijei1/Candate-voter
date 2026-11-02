"use client";

import { useState } from "react";

export function CheckForm() {
  const [targetType, setTargetType] = useState("race");
  const [targetId, setTargetId] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch("/api/admin/checks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType, targetId, note }),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Saved. It shows on that record." : (body.message ?? "Not saved."));
  }

  return (
    <form className="finder" onSubmit={save}>
      <label>
        Record
        <select value={targetType} onChange={(event) => setTargetType(event.target.value)}>
          <option value="race">Race</option>
          <option value="candidate">Candidate</option>
        </select>
      </label>
      <label>
        Id
        <input value={targetId} onChange={(event) => setTargetId(event.target.value)} required />
      </label>
      <label>
        Note
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={280} />
      </label>
      <button className="btn btn-cta" type="submit">
        Record check
      </button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
