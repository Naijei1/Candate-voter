import type { Metadata } from "next";
import Link from "next/link";
import { AnswerView } from "@/components/tv/Ask";
import { Crumbs } from "@/components/tv/bits";
import { answerQuestion } from "@/lib/tv/ask";

export const metadata: Metadata = { alternates: { canonical: "/ask" }, title: "Ask" };

type PageProps = { searchParams: Promise<{ q?: string | string[] }> };

const SUGGESTIONS = ["How much has each Senate candidate raised?", "Who is on my ballot in Fayette County?"];

export default async function AskPage({ searchParams }: PageProps) {
  const raw = (await searchParams).q;
  const question = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 300) ?? "";
  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Ask" }]} />
      <h1 className="t-h1 pt ask-h">Ask</h1>
      <p className="lede ask-l">Answers come only from our records.</p>
      <form className="composer big ask-box" action="/ask" method="get" role="search">
        <label className="sr" htmlFor="askq">
          Your question
        </label>
        <input id="askq" name="q" placeholder="Ask about a race or candidate…" autoComplete="off" enterKeyHint="send" defaultValue={question} maxLength={300} />
        <button className="btn primary" type="submit">
          Ask
        </button>
      </form>
      <div className="chips" id="ask-sugg">
        {SUGGESTIONS.map((text) => (
          <Link key={text} className="chip" href={`/ask?q=${encodeURIComponent(text)}`}>
            {text}
          </Link>
        ))}
      </div>
      <div id="ask-out" aria-live="polite">
        {question ? <AnswerView question={question} answer={answerQuestion(question)} /> : null}
      </div>
    </div>
  );
}
