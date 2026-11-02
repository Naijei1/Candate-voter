"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NEWS_CATEGORIES, SAMPLE_NEWS } from "@/content/pilot";
import { StatusMark } from "@/components/site/StatusMark";

export function NewsFeed() {
  const [categories, setCategories] = useState<string[]>([...NEWS_CATEGORIES]);
  const [states, setStates] = useState<string[]>([]);
  const [stateInput, setStateInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch("/api/news/feed")
      .then(async (response) => {
        if (response.status === 401) return;
        if (!response.ok) return;
        const body = (await response.json()) as { feed?: { states?: string[]; categories?: string[] } };
        if (cancel || !body.feed) return;
        setSignedIn(true);
        setStates(body.feed.states ?? []);
        if ((body.feed.categories ?? []).length > 0) setCategories(body.feed.categories ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  async function save(nextCategories: string[], nextStates: string[]) {
    setCategories(nextCategories);
    setStates(nextStates);
    const response = await fetch("/api/news/feed", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categories: nextCategories, states: nextStates }),
    });
    if (response.status === 401) {
      setSignedIn(false);
      setMessage("Not saved. Sign in to keep feed choices.");
      return;
    }
    setSignedIn(true);
    setMessage(response.ok ? "Feed saved. Notifications are unchanged." : "Feed choices were not saved.");
  }

  const items = SAMPLE_NEWS.filter((item) => categories.includes(item.category));

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
              {category}
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
          void fetch("/api/follows", {
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
          Follow area
        </button>
      </form>
      {states.length > 0 ? <p>Following {states.join(", ")}.</p> : <p>No followed states yet.</p>}
      {message ? <p role="status">{message}</p> : null}
      {!signedIn ? (
        <p>
          <Link href="/sign-in">Sign in</Link> to save this feed.
        </p>
      ) : null}
      <h2>Items</h2>
      <p>
        <StatusMark kind="sample" /> No verified news feed is connected. These cards are samples.
      </p>
      {items.length === 0 ? <p>No sample cards in the selected feed.</p> : null}
      <ul className="card-grid">
        {items.map((item) => (
          <li className="card" key={item.id}>
            <p>
              <StatusMark kind="sample" /> {item.kind}
            </p>
            <h3>{item.headline}</h3>
            <p className="hint">
              {item.publisher} · {item.date}
            </p>
            <p>{item.race}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
