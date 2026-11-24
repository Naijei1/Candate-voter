import { calendarDay, dayLabel } from "../format";
import { formatMoney } from "../finance/model";
import { certificationPhrase, generalResult, KY_ELECTION_CALENDAR, primaryResults } from "../site/certified-results";
import { mentionedCandidates } from "../site/ky-candidate-mentions";
import { kyBallot, type KyFinance, type KyPerson, type KyRace } from "../site/ky-ballot";
import { mentionedHouseDistrict, stateConfig } from "../states";
import { cycleMentionedIn, visitorQuestion, yearFromRaceId } from "./intent";
import type { ChatAnswer } from "./types";

/**
 * These shortcuts read the enabled state's stored cycle. A named year or a
 * page year from another cycle stays on the normal lookup.
 */
export function usesStoredKentuckyCycle(message: string, raceId?: string, cycle?: number): boolean {
  const stored = stateConfig().cycle;
  const named = cycleMentionedIn(visitorQuestion(message));
  if (named != null && named !== stored) return false;
  const pageYear = yearFromRaceId(raceId);
  if (pageYear != null && pageYear !== stored && named !== stored) return false;
  if (pageYear == null && cycle != null && cycle !== stored && named !== stored) return false;
  return true;
}

/** Raised, spent, winner, and certification answers from stored records. The model is not called. */
export function storedRaceAnswer(message: string, now = new Date(), raceId?: string, cycle?: number): ChatAnswer | null {
  if (!usesStoredKentuckyCycle(message, raceId, cycle)) return null;
  const question = visitorQuestion(message);
  const won = winnerAnswer(question, now, raceId);
  if (won) return won;
  const due = certificationAnswer(question, now);
  if (due) return due;
  return moneyAnswer(question);
}

function winnerAnswer(question: string, now: Date, raceId?: string): ChatAnswer | null {
  if (!/\bwho won\b|\bwho was elected\b|\bwinner of\b/i.test(question)) return null;
  const id = askedRaceId(question, raceId);
  if (!id) return null;
  if (/\bprimary\b/i.test(question)) return primaryWinnerAnswer(question, id);
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

function primaryWinnerAnswer(question: string, raceId: string): ChatAnswer | null {
  const party = askedParty(question);
  const results = primaryResults(raceId).filter((result) => !party || party.test(result.party));
  if (results.length === 0) return null;
  const state = stateConfig();
  const title = contestTitle(raceId);
  const lines = results.flatMap((result) => {
    const winner = result.candidates.find((person) => person.winner);
    if (!winner) return [];
    const certified = result.certificationDate ? ` Certified ${dayLabel(result.certificationDate)}.` : "";
    return [`**${winner.name}** won the ${result.party} primary for ${title}.${certified}`];
  });
  if (lines.length === 0) return null;
  const source = results[0];
  return {
    answer_markdown: lines.join("\n\n"),
    sources: [{ title: state.results.sourceName, url: source.sourceUrl, as_of: source.retrievedAt.slice(0, 10) }],
    refused: false,
    mode: "factual",
  };
}

function askedParty(question: string): RegExp | null {
  if (/\brepublican\b/i.test(question)) return /republican/i;
  if (/\bdemocrat/i.test(question)) return /democrat/i;
  if (/\blibertarian\b/i.test(question)) return /libertarian/i;
  return null;
}

type MoneyKind = "raised" | "spent" | "cash" | "debt";

function moneyAnswer(question: string): ChatAnswer | null {
  const kind = moneyKind(question);
  if (!kind) return null;
  const people = mentionedCandidates(question, true);
  if (people.length !== 1) return null;
  const person = people[0];
  const race = kyBallot(person.raceId);
  if (!race) return null;
  return financeAnswer(person, race, kind);
}

function moneyKind(question: string): MoneyKind | null {
  const spent = /\bspent\b|\bspending\b|\bdisburs/i.test(question);
  const cash = /\bcash on hand\b|\bcash\b/i.test(question);
  const debt = /\bdebt/i.test(question);
  const raised = /\braised\b|\braising\b|\bfundrais/i.test(question);
  const matched = [spent && "spent", cash && "cash", debt && "debt", raised && "raised"].filter(Boolean);
  return matched.length === 1 ? matched[0] as MoneyKind : null;
}

function financeAnswer(person: KyPerson & { raceId: string }, race: KyRace, kind: MoneyKind): ChatAnswer | null {
  const state = stateConfig();
  const title = contestTitle(race.raceId);
  if (!person.finance) {
    return {
      answer_markdown: `**${person.name}** is on the ${title} ballot. No ${kind} figure is on file.`,
      sources: [{ title: state.filings.name, url: state.filings.href, as_of: state.generalElection }],
      refused: false,
      mode: "factual",
    };
  }
  const figure = moneyFigure(person.finance, kind);
  if (!figure) return null;
  const through = dayLabel(person.finance.coverageEnd);
  return {
    answer_markdown: `**${person.name}**, on the ${title} ballot, ${figure} through ${through}.`,
    sources: [{ title: person.finance.sourceLabel, url: person.finance.sourceUrl, as_of: person.finance.coverageEnd }],
    refused: false,
    mode: "factual",
  };
}

function moneyFigure(money: KyFinance, kind: MoneyKind): string | null {
  if (kind === "raised") return `raised ${formatMoney(money.receipts)}`;
  if (kind === "spent") return `spent ${formatMoney(money.disbursements)}`;
  if (kind === "cash") return money.cash == null ? null : `had ${formatMoney(money.cash)} cash on hand`;
  return money.debts == null ? null : `reported ${formatMoney(money.debts)} in debts`;
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
