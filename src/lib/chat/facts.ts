import { calendarDay, dayLabel } from "../format";
import { formatMoney } from "../finance/model";
import { certificationPhrase, generalResult, KY_ELECTION_CALENDAR } from "../site/certified-results";
import { mentionedCandidates } from "../site/ky-candidate-mentions";
import { kyBallot, type KyPerson, type KyRace } from "../site/ky-ballot";
import { mentionedHouseDistrict, stateConfig } from "../states";
import { visitorQuestion } from "./intent";
import type { ChatAnswer } from "./types";

/** Raised, winner, and certification answers from stored records. The model is not called. */
export function storedRaceAnswer(message: string, now = new Date(), raceId?: string): ChatAnswer | null {
  const question = visitorQuestion(message);
  const won = winnerAnswer(question, now, raceId);
  if (won) return won;
  const due = certificationAnswer(question, now);
  if (due) return due;
  return raisedAnswer(question);
}

function winnerAnswer(question: string, now: Date, raceId?: string): ChatAnswer | null {
  if (!/\bwho won\b|\bwho was elected\b|\bwinner of\b/i.test(question)) return null;
  const id = askedRaceId(question, raceId);
  if (!id) return null;
  const state = stateConfig();
  const title = contestTitle(id);
  const official = state.results.official;
  const general = generalResult(id);
  if (general?.status === "certified") {
    const winner = general.candidates.find((person) => person.winner);
    return {
      answer_markdown: winner
        ? `**${winner.name}** was elected in the ${title} race. Certified ${dayLabel(general.certificationDate)}.`
        : `The ${title} result is certified.`,
      sources: [{ title: state.results.sourceName, url: general.sourceUrl, as_of: general.certificationDate }],
      refused: false,
      mode: "factual",
    };
  }
  const due = general?.status === "pending" ? general.scheduledCertificationDate : certificationDate();
  if (!due) return null;
  return {
    answer_markdown: `The ${title} result is not certified yet. ${certificationPhrase(due, now)} [See official results](${official.href}).`,
    sources: [{ title: official.label, url: official.href, as_of: due }],
    refused: false,
    mode: "factual",
  };
}

function certificationAnswer(question: string, now: Date): ChatAnswer | null {
  if (!/\bcertif/i.test(question)) return null;
  if (!/\bwhen\b|\bdeadline\b|\bdate\b|\bwill\b|\bdue\b/i.test(question)) return null;
  const due = certificationDate();
  if (!due) return null;
  const official = stateConfig().results.official;
  const today = calendarDay(now);
  const label = dayLabel(due);
  const lead = due < today ? `Certification was due ${label}.` : `Certification is due ${label}.`;
  return {
    answer_markdown: `${lead} [See official results](${official.href}).`,
    sources: [{ title: official.label, url: official.href, as_of: due }],
    refused: false,
    mode: "factual",
  };
}

function certificationDate(): string | null {
  const state = stateConfig();
  const general = generalResult(`${state.cycle}-senate-${state.code}`);
  if (general?.status === "pending") return general.scheduledCertificationDate;
  if (general?.status === "certified") return general.certificationDate;
  return KY_ELECTION_CALENDAR.find((item) => /certif/i.test(item.label))?.date ?? null;
}

function raisedAnswer(question: string): ChatAnswer | null {
  if (!/\braised\b|\braising\b|\bfundrais|\bhow much\b/i.test(question)) return null;
  const people = mentionedCandidates(question, true);
  if (people.length !== 1) return null;
  const person = people[0];
  const race = kyBallot(person.raceId);
  if (!race) return null;
  return financeAnswer(person, race);
}

function financeAnswer(person: KyPerson & { raceId: string }, race: KyRace): ChatAnswer {
  const state = stateConfig();
  const title = contestTitle(race.raceId);
  if (!person.finance) {
    return {
      answer_markdown: `**${person.name}** is on the ${title} ballot. No fundraising report is on file.`,
      sources: [{ title: state.filings.name, url: state.filings.href, as_of: state.generalElection }],
      refused: false,
      mode: "factual",
    };
  }
  const money = person.finance;
  const through = dayLabel(money.coverageEnd);
  return {
    answer_markdown: `**${person.name}**, on the ${title} ballot, raised ${formatMoney(money.receipts)} through ${through}.`,
    sources: [{ title: money.sourceLabel, url: money.sourceUrl, as_of: money.coverageEnd }],
    refused: false,
    mode: "factual",
  };
}

function askedRaceId(question: string, pageRaceId?: string): string | null {
  const state = stateConfig();
  const district = mentionedHouseDistrict(question, state);
  if (district) return `${state.cycle}-house-${state.code}-${district.padStart(2, "0")}`;
  if (/\bsenate\b/i.test(question)) return `${state.cycle}-senate-${state.code}`;
  if (pageRaceId && kyBallot(pageRaceId)) return pageRaceId;
  return null;
}

function contestTitle(raceId: string): string {
  if (raceId.includes("senate")) return "U.S. Senate";
  return `U.S. House District ${Number(raceId.slice(-2))}`;
}
