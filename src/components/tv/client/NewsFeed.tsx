"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeedItem } from "@/lib/tv/news";
import { NewsRow } from "../NewsList";
import { readJson, writeJson } from "./device";
import { usePlace } from "./Yours";

export type FeedRace = { raceId: string; title: string; district: number | null };

/** News with "Your feed" (saved county's races plus statewide items) and "All". Topic choices stay on this device. */
export function NewsFeed({ items, topics, races }: { items: FeedItem[]; topics: ReadonlyArray<{ id: string; label: string }>; races: FeedRace[] }) {
  const place = usePlace();
  const [feed, setFeed] = useState<"mine" | "all">("mine");
  const [cats, setCats] = useState<string[]>([]);
  const [race, setRace] = useState("");

  useEffect(() => {
    setCats(readJson<string[]>("tv-news-cats", []));
    const wanted = new URLSearchParams(location.search).get("race") ?? "";
    if (races.some((row) => row.raceId === wanted)) setRace(wanted);
  }, [races]);

  const mine = useMemo(() => {
    if (!place?.d.length) return null;
    return races.filter((row) => row.district == null || place.d.includes(row.district)).map((row) => row.raceId);
  }, [place, races]);

  const shown = items.filter((item) => {
    if (feed === "all") return true;
    const ids = item.races.map((row) => row.raceId);
    if (cats.length && !cats.some((cat) => item.cats.includes(cat))) return false;
    if (race && !ids.includes(race)) return false;
    if (mine && ids.length && !ids.some((id) => mine.includes(id))) return false;
    return true;
  });

  const toggle = (id: string) => {
    const next = !id ? [] : cats.includes(id) ? cats.filter((cat) => cat !== id) : [...cats, id];
    setCats(next);
    writeJson("tv-news-cats", next);
  };

  const chooseRace = (value: string) => {
    setRace(value);
    const url = new URL(location.href);
    if (value) url.searchParams.set("race", value);
    else url.searchParams.delete("race");
    history.replaceState(history.state, "", url);
  };

  return (
    <>
      <div className="ntabs" role="tablist" aria-label="Feed">
        <button role="tab" type="button" aria-selected={feed === "mine"} aria-controls="nlist" onClick={() => setFeed("mine")}>
          Your feed
        </button>
        <button role="tab" type="button" aria-selected={feed === "all"} aria-controls="nlist" aria-label="All election news" onClick={() => setFeed("all")}>
          All
        </button>
      </div>
      {feed === "mine" ? (
        <details className="how">
          <summary>Filter topics</summary>
          <div className="how-b nprefs">
            <p className="np-h sr" id="np-h">
              Topics
            </p>
            <div className="chips" role="group" aria-labelledby="np-h">
              <button className="chip" type="button" aria-pressed={cats.length === 0} onClick={() => toggle("")}>
                All topics
              </button>
              {topics.map((topic) => (
                <button key={topic.id} className="chip" type="button" aria-pressed={cats.includes(topic.id)} onClick={() => toggle(topic.id)}>
                  {topic.label}
                </button>
              ))}
            </div>
            <div className="np-r">
              <label htmlFor="nrace">Race</label>
              <select className="input sm" id="nrace" value={race} onChange={(event) => chooseRace(event.target.value)}>
                <option value="">All races</option>
                {races.map((row) => (
                  <option key={row.raceId} value={row.raceId}>
                    {row.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </details>
      ) : null}
      <p className="sr" aria-live="polite">
        {shown.length} {shown.length === 1 ? "item" : "items"}
      </p>
      <div id="nlist" role="tabpanel">
        {shown.length ? (
          <ul className="news big">
            {shown.map((item) => (
              <NewsRow key={item.url} item={item} images />
            ))}
          </ul>
        ) : (
          <div className="empty">
            <p className="empty-t">No items in these topics.</p>
          </div>
        )}
      </div>
    </>
  );
}
