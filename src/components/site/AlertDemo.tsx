"use client";

import { useState } from "react";
import { NEWS_CATEGORIES, SAMPLE_NEWS } from "@/content/pilot";
import { StatusMark } from "@/components/site/StatusMark";

const ALERT_TYPES = [
  "Newly detected filings",
  "Ballot-status changes",
  "Statements",
  "Polls",
  "Debates",
  "Election deadlines",
] as const;

type Screen = "empty" | "loading" | "error" | "none";

export function AlertDemo() {
  const [screen, setScreen] = useState<Screen>("empty");
  return (
    <div>
      <p>
        <StatusMark kind="preview" />
        These screens are a demonstration. Preferences stay in this page only. Refreshing clears
        them. Nothing is emailed, and there is no push notification.
      </p>
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
      <fieldset className="section">
        <legend>Alert categories</legend>
        <div className="check-grid">
          {ALERT_TYPES.map((item) => (
            <label key={item}>
              <input type="checkbox" defaultChecked={item === "Newly detected filings"} /> {item}
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
          <input type="radio" name="digest" /> Daily digest
        </label>
        <label>
          <input type="radio" name="digest" /> Weekly digest
        </label>
        <p>Quiet hours and unsubscribe will be settings on the account. They do not send mail in this preview.</p>
      </fieldset>
    </div>
  );
}

function AlertScreen({ screen }: { screen: Screen }) {
  if (screen === "loading") {
    return (
      <p className="notice" role="status" aria-busy="true">
        Loading alert preferences…
      </p>
    );
  }
  if (screen === "error") {
    return (
      <p className="notice notice-error" role="alert">
        Alert preferences could not be displayed. This preview does not contact a server. Try the
        empty screen.
      </p>
    );
  }
  if (screen === "none") {
    return (
      <p className="notice" role="status">
        No alerts match these categories.
      </p>
    );
  }
  return (
    <p className="notice" role="status">
      You are not following any races or candidates. Follow a race to see it here once accounts
      exist.
    </p>
  );
}

export function NewsBoard() {
  const [picked, setPicked] = useState<string[]>(["Election deadlines", "Candidate statements", "Campaign finance"]);
  const items = SAMPLE_NEWS.filter((item) => picked.includes(item.category));
  return (
    <div>
      <fieldset>
        <legend>News categories on this page</legend>
        <p>
          <StatusMark kind="preview" />
          Choosing a category changes this page only. It is not permission to send a notification.
          Following a candidate is separate from these boxes.
        </p>
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
        <p role="status">No sample stories match the categories you selected.</p>
      ) : (
        <ul className="card-grid">
          {items.map((item) => (
            <li className="card" key={item.id}>
              <p>
                <StatusMark kind="sample" />
                {item.kind}
              </p>
              <h2>{item.headline}</h2>
              <p>
                {item.publisher} · {item.date}
              </p>
              <p>Related race: {item.race}</p>
              <p>Source link: not available in this sample. No outside article is being presented as live reporting.</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
