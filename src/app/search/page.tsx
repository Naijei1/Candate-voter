import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { Crumbs } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { Icon } from "@/components/tv/Icon";
import { withBasePath } from "@/lib/base-path";
import { dayLabel } from "@/lib/format";
import { searchIndex, type IndexEntry } from "@/lib/tv/index-search";
import { newsFeed } from "@/lib/tv/news";
import { siteIndex } from "@/lib/tv/site-index";

export const metadata: Metadata = { title: "Search", alternates: { canonical: "/search" }, robots: { index: false } };

type PageProps = { searchParams: Promise<{ q?: string | string[] }> };

const KIND: Record<IndexEntry["g"], string> = { Pages: "Page", Races: "Race", Candidates: "Candidate", Committees: "Committee" };

function Marked({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return <>{parts.map((part, index) => (index % 2 ? <mark key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>))}</>;
}

function Lead({ entry }: { entry: IndexEntry }) {
  if (entry.img !== undefined) {
    return <span className="face">{entry.img ? <img src={entry.img} alt="" width={48} height={48} loading="lazy" /> : null}</span>;
  }
  return (
    <span className="ai">
      <Icon name={entry.i ?? "info"} size="sm" />
    </span>
  );
}

export default async function SearchPage({ searchParams }: PageProps) {
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 120) ?? "";
  const rows = query ? searchIndex(siteIndex(), query, 12) : [];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const news = query ? (await newsFeed()).filter((item) => words.every((word) => item.title.toLowerCase().includes(word))).slice(0, 4) : [];
  return (
    <div className="wrap srch">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Search" }]} />
      <h1 className="t-h1 pt">{query ? `Search: ${query}` : "Search"}</h1>
      <form className="composer big" role="search" action={withBasePath("/search")} method="get">
        <Icon name="search" />
        <label className="sr" htmlFor="s-q">
          Search
        </label>
        <input id="s-q" name="q" defaultValue={query} autoComplete="off" placeholder="A name, district or state…" maxLength={120} />
        <button className="btn primary" type="submit">
          Search
        </button>
      </form>
      {query ? (
        <>
          <p className="muted s-count" aria-live="polite">
            {rows.length ? `${rows.length} ${rows.length === 1 ? "result" : "results"}` : ""}
          </p>
          {rows.length ? (
            <div className="rlist">
              {rows.map((entry) => (
                <Link key={`${entry.g}-${entry.h}`} className="rrow sr-row" href={entry.h}>
                  <Lead entry={entry} />
                  <span className="rt">
                    <b>
                      <Marked text={entry.t} query={query} />
                    </b>
                    <span>
                      {KIND[entry.g]}
                      {entry.s ? `, ${entry.s}` : ""}
                    </span>
                  </span>
                  <Icon name="right" size="sm" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">
              <p className="empty-t">No results for “{query}”.</p>
              <p>THE VOTE covers U.S. Senate and House races. Try a name, “District 4” or a state.</p>
            </div>
          )}
          <p className="s-ask">
            <Link href={`/ask?q=${encodeURIComponent(query)}`}>Ask about “{query}”</Link>
          </p>
          {news.length ? (
            <>
              <h2 className="sub-h">News that mentions “{query}”</h2>
              <ul className="news">
                {news.map((item) => (
                  <li className="nitem" key={item.url}>
                    <div className="nb">
                      <ExtLink className="nt" href={item.url}>
                        {item.title}
                      </ExtLink>
                      <p className="nm">
                        <span>{item.source}</span>
                        <span>{dayLabel(item.date)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
