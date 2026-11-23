import type { Metadata } from "next";
import Link from "next/link";
import { withBasePath } from "@/lib/base-path";
import { searchSite } from "@/lib/site/search-index";
import styles from "@/components/site/reading.module.css";

export const metadata: Metadata = { title: "Search", alternates: { canonical: "/search" } };

type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: PageProps) {
  const query = (await searchParams).q?.trim() ?? "";
  const hits = query ? searchSite(query) : [];
  return (
    <article className="wrap">
      <h1>Search</h1>
      <form className="finder" method="get" action={withBasePath("/search")}>
        <label htmlFor="q">Candidates, races, and counties</label>
        <input id="q" name="q" type="search" defaultValue={query} />
        <button className="btn btn-navy" type="submit">Search</button>
      </form>
      {query && hits.length === 0 ? <p>No matching candidate, race, or county.</p> : null}
      {hits.length > 0 ? (
        <ul className={styles.searchHits}>
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.href}-${hit.title}`}>
              <span className={styles.kind}>{hit.kind}</span>
              {hit.href.startsWith("http") ? <a href={hit.href}>{hit.title}</a> : <Link href={hit.href}>{hit.title}</Link>}
              <p className="hint">{hit.detail}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {query ? (
        <p className={styles.tools}><Link href={`/ask?q=${encodeURIComponent(query)}`}>Ask about “{query}”</Link></p>
      ) : null}
    </article>
  );
}
