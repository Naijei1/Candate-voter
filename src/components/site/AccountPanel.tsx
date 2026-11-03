"use client";

import Link from "next/link";
import { useState } from "react";
import { ALERT_CATEGORIES, type AlertDelivery, type AlertPreferences, type Follow } from "@/lib/users/alerts";

const CATEGORY_LABEL: Record<(typeof ALERT_CATEGORIES)[number], string> = {
  filings: "New filings",
  ballot: "Ballot changes",
  statements: "Statements",
  polls: "Polls",
  debates: "Debates",
  deadlines: "Deadlines",
  "finance-receipts": "Money raised",
  "finance-disbursements": "Money spent",
  "finance-cash": "Cash left",
  "finance-debts": "Debts",
  "finance-outside": "Spending by other groups",
};

const FOLLOW_LABEL = {
  race: "Race",
  candidate: "Person",
  jurisdiction: "Place",
  measure: "Ballot question",
  issue: "Topic",
} as const;

export function AccountPanel({
  email,
  preferences,
  follows,
  loadError,
}: {
  email: string;
  preferences: AlertPreferences;
  follows: Follow[];
  loadError: boolean;
}) {
  const [categories, setCategories] = useState<string[]>(preferences.categories);
  const [delivery, setDelivery] = useState<AlertDelivery>(preferences.delivery);
  const [quietStart, setQuietStart] = useState(preferences.quietStart ?? "");
  const [quietEnd, setQuietEnd] = useState(preferences.quietEnd ?? "");
  const [saved, setSaved] = useState<Follow[]>(follows);
  const [message, setMessage] = useState<string | null>(loadError ? "Could not load saved preferences." : null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/alerts", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categories,
          delivery,
          quietStart: quietStart || null,
          quietEnd: quietEnd || null,
        }),
      });
      const body = await readJson(response);
      setMessage(response.ok ? "Saved. Email alerts are not on yet." : (body.message ?? "Not saved."));
    } catch {
      setMessage("Not saved.");
    } finally {
      setBusy(false);
    }
  }

  async function unfollow(follow: Follow) {
    const response = await fetch("/api/follows", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: follow.targetType, targetId: follow.targetId }),
    });
    if (!response.ok) {
      setMessage("Could not remove that follow.");
      return;
    }
    setSaved((current) =>
      current.filter((item) => item.targetType !== follow.targetType || item.targetId !== follow.targetId),
    );
  }

  return (
    <div>
      <p>{email}</p>
      <p>Email alerts are not on yet. Saved races stay on this account.</p>
      <h2>Saved</h2>
      {saved.length === 0 ? (
        <p>
          Nothing saved yet. <Link href="/states/ky">See Kentucky races</Link> and follow one.
        </p>
      ) : (
        <ul className="plain-list">
          {saved.map((follow) => {
            const href = followHref(follow);
            return (
              <li key={`${follow.targetType}:${follow.targetId}`}>
                {FOLLOW_LABEL[follow.targetType]}
                {href ? (
                  <>
                    {" · "}
                    <Link href={href}>Open</Link>
                  </>
                ) : null}{" "}
                <button className="btn btn-ghost" type="button" onClick={() => unfollow(follow)}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form className="finder" onSubmit={save}>
        <fieldset>
          <legend>Types</legend>
          <div className="check-grid">
            {ALERT_CATEGORIES.map((category) => (
              <label key={category}>
                <input
                  type="checkbox"
                  checked={categories.includes(category)}
                  onChange={() =>
                    setCategories((current) =>
                      current.includes(category)
                        ? current.filter((item) => item !== category)
                        : [...current, category],
                    )
                  }
                />{" "}
                {CATEGORY_LABEL[category]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>How often, once email is on</legend>
          {(
            [
              ["immediate", "Immediate"],
              ["daily", "Daily"],
              ["weekly", "Weekly"],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="digest"
                checked={delivery === value}
                onChange={() => setDelivery(value)}
              />{" "}
              {label}
            </label>
          ))}
        </fieldset>
        <label htmlFor="quiet-start">
          Quiet hours start
          <input
            id="quiet-start"
            type="time"
            value={quietStart}
            onChange={(event) => setQuietStart(event.target.value)}
          />
        </label>
        <label htmlFor="quiet-end">
          Quiet hours end
          <input id="quiet-end" type="time" value={quietEnd} onChange={(event) => setQuietEnd(event.target.value)} />
        </label>
        <button className="btn btn-cta" type="submit" disabled={busy}>
          Save preferences
        </button>
        {message ? (
          <p role="status" className="notice">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function followHref(follow: Follow): string | null {
  if (follow.targetType === "race") return `/races/${follow.targetId}`;
  if (follow.targetType === "candidate") return `/candidates/${follow.targetId}`;
  if (follow.targetType === "jurisdiction" && /^[A-Za-z]{2}$/.test(follow.targetId)) {
    return `/states/${follow.targetId.toLowerCase()}`;
  }
  if (follow.targetType === "measure") return "/measures";
  return null;
}

async function readJson(response: Response): Promise<{ message?: string }> {
  try {
    const body = await response.json();
    return body && typeof body === "object" ? (body as { message?: string }) : {};
  } catch {
    return {};
  }
}
