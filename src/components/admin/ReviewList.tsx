"use client";

import { useState } from "react";

const STATUSES = ["new", "reviewing", "fixed", "rejected"] as const;

type ReviewRow = {
  correctionId: string;
  note: string;
  createdAt: string;
  raceId: string | null;
  candidateId: string | null;
  status: (typeof STATUSES)[number];
  statusLog: { at: string; status: string }[];
};

export function ReviewList({ items }: { items: ReviewRow[] }) {
  const [rows, setRows] = useState(items);
  const [message, setMessage] = useState<string | null>(null);

  async function save(correctionId: string, status: string) {
    setMessage(null);
    const response = await fetch("/api/admin/corrections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ correctionId, status }),
    });
    if (!response.ok) {
      setMessage("Status was not saved.");
      return;
    }
    setRows((current) =>
      current.map((row) =>
        row.correctionId === correctionId ? { ...row, status: status as ReviewRow["status"] } : row,
      ),
    );
    setMessage("Saved.");
  }

  if (rows.length === 0) return <p>No reports yet.</p>;
  return (
    <ul className="plain-list">
      {rows.map((item) => (
        <li key={item.correctionId}>
          <p>{item.note}</p>
          <p className="hint">
            {item.status} · {item.createdAt}
            {item.raceId ? ` · ${item.raceId}` : ""}
            {item.candidateId ? ` · ${item.candidateId}` : ""}
          </p>
          <label>
            Status
            <select defaultValue={item.status} id={`status-${item.correctionId}`} name={item.correctionId}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn btn-navy"
            type="button"
            onClick={() => {
              const selected = document.getElementById(`status-${item.correctionId}`) as HTMLSelectElement | null;
              if (selected) void save(item.correctionId, selected.value);
            }}
          >
            Save status
          </button>
          {item.statusLog.length > 0 ? (
            <ul>
              {item.statusLog.map((event) => (
                <li key={`${event.at}-${event.status}`}>
                  {event.status} · {event.at}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
      {message ? <li role="status">{message}</li> : null}
    </ul>
  );
}
