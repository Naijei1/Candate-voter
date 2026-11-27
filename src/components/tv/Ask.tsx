import Link from "next/link";
import { shortMoney } from "@/lib/finance/model";
import type { AskAnswer } from "@/lib/tv/ask";
import { ReportButton } from "./client/Report";
import { Face, PartyTag } from "./bits";
import { ExtLink } from "./ExtLink";

function isExternal(href: string): boolean {
  return /^https?:/.test(href);
}

export function AnswerView({ question, answer }: { question: string; answer: AskAnswer }) {
  const top = Math.max(1, ...(answer.bars ?? []).map((row) => row.value ?? 0));
  return (
    <>
      <p className="qa-q">{question}</p>
      <article className="qa-a" aria-label="Answer">
        <p className="lead-a">
          <b>{answer.lead[0]}</b>
          {answer.lead[1] ? ` ${answer.lead[1]}` : null}
        </p>
        {answer.people ? (
          <ul className="alist2">
            {answer.people.map(({ person, status }) => (
              <li key={person.id}>
                <Link href={`/candidates/${person.id}`}>
                  <Face person={person} />
                  <span>
                    <b>{person.name}</b>
                    <span className="status">{status}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {answer.groups?.map((group) => (
          <div key={group.href}>
            <h3 className="sub-h">
              <Link href={group.href}>{group.title}</Link>
            </h3>
            <ul className="alist2">
              {group.people.map((person) => (
                <li key={person.id}>
                  <Link href={`/candidates/${person.id}`}>
                    <Face person={person} />
                    <span>
                      <b>{person.name}</b>
                      <span className="status">{person.role}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {answer.stances ? (
          <div className="stl">
            {answer.stances.map(({ person, text }) => (
              <div className="issue" key={person.id}>
                <h3>
                  <Face person={person} />
                  {person.name}
                </h3>
                {text ? <p>{text}</p> : <p className="none">No sourced statement on file.</p>}
              </div>
            ))}
          </div>
        ) : null}
        {answer.bars ? (
          <div className="bars">
            {answer.bars.map(({ person, value }) => (
              <div className="brow" key={person.id}>
                <div className="who">
                  <PartyTag party={person.party} size="sm" />
                  <Link href={`/candidates/${person.id}`}>{person.name}</Link>
                </div>
                {value == null ? (
                  <span className="val none wide">No FEC report</span>
                ) : (
                  <>
                    <div className="track" aria-hidden="true">
                      <span className="fill" style={{ width: `${((value / top) * 100).toFixed(1)}%` }} />
                    </div>
                    <span className="val">{shortMoney(value)}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : null}
        {answer.sources.length > 0 ? (
          <section className="srcs-a" aria-label="Sources">
            <p className="srcs-h">
              Answered from {answer.sources.length} {answer.sources.length === 1 ? "source" : "sources"}
            </p>
            <ol className="srccards">
              {answer.sources.map((source, index) => (
                <li key={`${source.url}-${index}`}>
                  <ExtLink href={source.url}>
                    <span className="sn2" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span>{source.label}</span>
                  </ExtLink>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {answer.next.length > 0 ? (
          <div className="nextrow">
            {answer.next.map((link, index) => (
              <span key={link.href} className="nextrow-i">
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                {isExternal(link.href) ? <ExtLink href={link.href}>{link.label}</ExtLink> : <Link href={link.href}>{link.label}</Link>}
              </span>
            ))}
          </div>
        ) : null}
        <p className="askp-f">
          <ReportButton>Report an error in this answer</ReportButton>
        </p>
      </article>
    </>
  );
}

/** Suggested questions and a box that answers on the Ask page. */
export function AskPanel({ id, place, questions }: { id: string; place: string; questions: string[] }) {
  return (
    <div className="askp" id={id}>
      <h2 className="askp-t">Ask about this race</h2>
      <div className="chips col">
        {questions.map((question) => (
          <Link key={question} className="chip" href={`/ask?q=${encodeURIComponent(question)}`}>
            {question}
          </Link>
        ))}
      </div>
      <form className="composer" action="/ask">
        <label className="sr" htmlFor={`${id}-q`}>
          Your question about {place}
        </label>
        <input className="input" id={`${id}-q`} name="q" placeholder={`Ask about ${place}…`} autoComplete="off" enterKeyHint="send" required />
        <button className="btn primary sm" type="submit">
          Ask
        </button>
      </form>
      <p className="askp-f">
        <ReportButton />
      </p>
    </div>
  );
}
