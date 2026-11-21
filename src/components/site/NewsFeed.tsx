"use client";

import { withBasePath } from "@/lib/base-path";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NEWS_CATEGORIES } from "@/content/pilot";

const FEED_LABEL: Record<(typeof NEWS_CATEGORIES)[number], string> = {
  "Candidate statements": "What candidates say",
  "Campaign finance": "Campaign money",
  "PAC activity": "Spending by other groups",
  Polls: "Polls",
  Debates: "Debates",
  "Ballot measures": "Ballot questions",
  "Election deadlines": "Election deadlines",
};

export function NewsFeed({ signedIn }: { signedIn: boolean }) {
  const [categories, setCategories] = useState<string[]>([...NEWS_CATEGORIES]);
  const [states, setStates] = useState<string[]>([]);
  const [stateInput, setStateInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const canSave = signedIn && !sessionExpired;

  useEffect(() => {
    if (!canSave) return;
    let cancel = false;
    fetch(withBasePath("/api/news/feed"))
      .then(async (response) => {
        if (!cancel && response.status === 401) setSessionExpired(true);
        if (!response.ok) return;
        const body = (await response.json()) as { feed?: { states?: string[]; categories?: string[] } };
        if (cancel || !body.feed) return;
        setStates(body.feed.states ?? []);
        if ((body.feed.categories ?? []).length > 0) setCategories(body.feed.categories ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [canSave]);

  async function save(nextCategories: string[], nextStates: string[]) {
    setCategories(nextCategories);
    setStates(nextStates);
    if (!canSave) {
      setMessage("Not saved. Sign in to keep feed choices.");
      return;
    }
    const response = await fetch(withBasePath("/api/news/feed"), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categories: nextCategories, states: nextStates }),
    });
    if (response.status === 401) {
      setSessionExpired(true);
      setMessage("Not saved. Sign in to keep feed choices.");
      return;
    }
    setMessage(response.ok ? "Feed saved. Notifications are unchanged." : "Feed choices were not saved.");
  }

  return (
    <div>
      <p>
        Feed choices are separate from <Link href="/account">notification settings</Link>.
      </p>
      <fieldset>
        <legend>Feed</legend>
        <div className="check-grid">
          {NEWS_CATEGORIES.map((category) => (
            <label key={category}>
              <input
                type="checkbox"
                checked={categories.includes(category)}
                onChange={() => {
                  const next = categories.includes(category)
                    ? categories.filter((item) => item !== category)
                    : [...categories, category];
                  void save(next, states);
                }}
              />{" "}
              {FEED_LABEL[category] ?? category}
            </label>
          ))}
        </div>
      </fieldset>
      <form
        className="finder-row"
        onSubmit={(event) => {
          event.preventDefault();
          const postal = stateInput.trim().toUpperCase();
          if (!/^[A-Z]{2}$/.test(postal) || states.includes(postal)) return;
          setStateInput("");
          void save(categories, [...states, postal]);
          if (!canSave) return;
          void fetch(withBasePath("/api/follows"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ targetType: "jurisdiction", targetId: postal }),
          });
        }}
      >
        <label htmlFor="news-state">
          Follow a state
          <input id="news-state" value={stateInput} onChange={(event) => setStateInput(event.target.value)} maxLength={2} />
        </label>
        <button className="btn btn-navy" type="submit">
          Add state
        </button>
      </form>
      {states.length > 0 ? <p>Following {states.join(", ")}.</p> : <p>No followed states yet.</p>}
      {message ? <p role="status">{message}</p> : null}
      {!canSave ? (
        <p>
          <Link href="/sign-in">Sign in</Link> to save this feed.
        </p>
      ) : null}
      <h2>Feed choices</h2>
      <p>The list above is the Kentucky Lantern feed.</p>
      <p>
        <Link className="btn btn-navy" href="/">
          See Kentucky races
        </Link>
      </p>
    </div>
  );
}
