"use client";

import { useEffect, useState } from "react";
import { readJson, SAVED_EVENT, savedKeys, savedNames, writeJson } from "./device";
import { PopMenu } from "./PopMenu";
import { Icon } from "../Icon";

const TOPICS = ["New filings", "Ballot-status changes", "New statements", "New polls", "Debate updates", "Election deadlines"];
const DELIVERY = [
  { value: "now", label: "As it happens" },
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly digest" },
];

type Prefs = { off?: string[]; del?: string };

export function AlertsButton() {
  const [follows, setFollows] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<Prefs>({});

  useEffect(() => {
    const sync = () => {
      const names = savedNames();
      setFollows(savedKeys().map((key) => names[key] ?? key));
    };
    sync();
    setPrefs(readJson<Prefs>("tv-alerts", {}));
    window.addEventListener(SAVED_EVENT, sync);
    return () => window.removeEventListener(SAVED_EVENT, sync);
  }, []);

  const update = (next: Prefs) => {
    setPrefs(next);
    writeJson("tv-alerts", next);
  };

  return (
    <PopMenu
      label="Alerts"
      kind="dialog"
      className="pop alerts"
      labelledBy="al-h"
      buttonClass="icon-btn bell"
      buttonLabel="Alerts (preview)"
      button={
        <>
          <Icon name="bell" />
          <span className="dot" aria-hidden="true" />
        </>
      }
    >
      <div className="pop-h">
        <h2 id="al-h">Alerts</h2>
        <span className="tag-prev">Preview</span>
      </div>
      <p className="pop-p">Saved on this device. Nothing is sent yet.</p>
      <h3 className="pop-s">You follow</h3>
      <ul className="followlist">
        {follows.length ? follows.map((name) => <li key={name}>{name}</li>) : <li className="muted">Nothing yet. Use Follow on a race, candidate or state.</li>}
      </ul>
      <fieldset>
        <legend className="pop-s">Alert me about</legend>
        {TOPICS.map((topic) => (
          <label className="ck-row" key={topic}>
            <input
              type="checkbox"
              checked={!(prefs.off ?? []).includes(topic)}
              onChange={(event) => {
                const off = new Set(prefs.off ?? []);
                if (event.target.checked) off.delete(topic);
                else off.add(topic);
                update({ ...prefs, off: [...off] });
              }}
            />
            <span>{topic}</span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="pop-s">Delivery</legend>
        {DELIVERY.map((option) => (
          <label className="ck-row" key={option.value}>
            <input
              type="radio"
              name="al-del"
              value={option.value}
              checked={(prefs.del ?? "now") === option.value}
              onChange={() => update({ ...prefs, del: option.value })}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
    </PopMenu>
  );
}
