"use client";

import { useState } from "react";
import { NEWS_CATEGORIES, SAMPLE_NEWS } from "@/content/pilot";
import { StatusMark } from "@/components/site/StatusMark";

const ALERT_TYPES = [
  "Filings",
  "Ballot status",
  "Statements",
  "Polls",
  "Debates",
  "Deadlines",
] as const;

type Screen = "empty" | "loading" | "error" | "none";

export function AlertDemo() {
  const [screen, setScreen] = useState<Screen>("empty");
  return (
    <div>
      <div className="filters" role="group" aria-label="Alert preview states">
        {(
          [
            ["empty", "Empty"],
            ["loading", "Loading"],
            ["error", "Error"],
            ["none", "No results"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className="btn btn-ghost"
            type="button"
            aria-pressed={screen === id}
            onClick={() => setScreen(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <AlertScreen screen={screen} />
      <fieldset>
        <legend>Categories</legend>
        <div className="check-grid">
          {ALERT_TYPES.map((item) => (
            <label key={item}>
              <input type="checkbox" defaultChecked={item === "Filings"} /> {item}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Delivery</legend>
        <label>
          <input type="radio" name="digest" defaultChecked /> Immediate
        </label>
        <label>
          <input type="radio" name="digest" /> Daily
        </label>
        <label>
          <input type="radio" name="digest" /> Weekly
        </label>
      </fieldset>
    </div>
  );
}

function AlertScreen({ screen }: { screen: Screen }) {
  if (screen === "loading") {
    return (
      <p className="notice" role="status" aria-busy="true">
        Loading…
      </p>
    );
  }
  if (screen === "error") {
    return (
      <p className="notice notice-error" role="alert">
        Could not load alerts.
      </p>
    );
  }
  if (screen === "none") {
    return (
      <p className="notice" role="status">
        No matching alerts.
      </p>
    );
  }
  return (
    <p className="notice" role="status">
      No saved races.
    </p>
  );
}

export function NewsBoard() {
  const [picked, setPicked] = useState<string[]>(["Election deadlines", "Candidate statements", "Campaign finance"]);
  const items = SAMPLE_NEWS.filter((item) => picked.includes(item.category));
  return (
    <div>
      <fieldset>
        <legend>Categories</legend>
        <div className="check-grid">
          {NEWS_CATEGORIES.map((category) => (
            <label key={category}>
              <input
                type="checkbox"
                checked={picked.includes(category)}
                onChange={() =>
                  setPicked((current) =>
                    current.includes(category)
                      ? current.filter((item) => item !== category)
                      : [...current, category],
                  )
                }
              />{" "}
              {category}
            </label>
          ))}
        </div>
      </fieldset>
      {items.length === 0 ? (
        <p role="status">No stories in those categories.</p>
      ) : (
        <ul className="card-grid">
          {items.map((item) => (
            <li className="card" key={item.id}>
              <p>
                <StatusMark kind="sample" /> {item.kind}
              </p>
              <h2>{item.headline}</h2>
              <p className="hint">
                {item.publisher} · {item.date}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
