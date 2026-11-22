import { candidatesWithEvidence, compareBasis, comparisonOnTopic, normalizeTopic, REFUSALS, selectCandidates, type Claim, type Evidence } from "../compare/evidence";
import type { CompareService } from "../compare/service";
import { recordsOnlySummary } from "../compare/summarize";
import { mentionedCandidates, mentionedRaces } from "../site/ky-candidate-mentions";
import { cycleMentionedIn, isStatePanelMessage, stateFromRaceId, stateMentionedIn, visitorQuestion, yearFromRaceId } from "./intent";
import { citationLink } from "./ui";
import type { ChatAnswer, ChatRequest, ChatSource } from "./types";

function requestedTopic(question: string): string | undefined {
  const phrase = /^(?:on|about|regarding)\s+([^,?!]+),/i.exec(question)?.[1] ??
    /\b(?:on|about|regarding|when it comes to)\s+([^,?!]+)/i.exec(question)?.[1] ??
    /(?:['’]s|\btheir)\s+([^,?!]+?)\s+(?:polic(?:y|ies)|positions?|stances?)\b/i.exec(question)?.[1];
  if (!phrase) return;
  const topic = normalizeTopic(phrase
    .replace(/^their\s+/i, "")
    .replace(/(?:^|\s)and (?:where|how|what)\b.*$/i, "")
    .replace(/\s+(?:in this race|differ|compare)\s*\.?$/i, "")
    .replace(/\s+(?:polic(?:y|ies)|positions?|stances?)\s*\.?$/i, ""));
  if (!topic || /^(?:(?:\w+ )?ballot|(?:general |policy )?issues|policy|positions|records|stances)$/.test(topic)) return;
  return topic;
}

export async function comparisonAnswer(
  request: ChatRequest, clientKey: string, service?: CompareService,
): Promise<{ answer: ChatAnswer; headers?: Record<string, string>; status?: number } | null> {
  const question = visitorQuestion(request.message);
  if (!/\b(?:compar(?:e|ed|ing|ison)|differ(?:s|ed|ences?|ent)?|agree(?:s|d|ment)?|common ground|in common|similarities|versus|vs\.?)\b/i.test(question)) return null;
  const state = stateMentionedIn(question) ?? request.state ?? stateFromRaceId(request.raceId);
  const cycle = cycleMentionedIn(question) ?? request.cycle ?? yearFromRaceId(request.raceId);
  if ((state && state !== "KY") || (cycle && cycle !== 2026)) return null;

  const people = mentionedCandidates(question, true);
  if (!people.length && /\bhouse\b/i.test(question) && /\bsenate\b/i.test(question) && !/\bdistrict\b/i.test(question)) return null;
  const reportRaces = people.length ? [] : mentionedRaces(question, true);
  const raceIds = [...new Set([...people.map((person) => person.raceId), ...reportRaces])];
  if (!raceIds.length && request.raceId && !isStatePanelMessage(request.message) &&
      /\b(?:they|them|their|candidates?|this race)\b/i.test(question) && compareBasis(request.raceId)) raceIds.push(request.raceId);
  if (!raceIds.length) return null;
  const topic = requestedTopic(question);

  const sources = new Map<string, ChatSource>();
  function add(row: Evidence) {
    if (!sources.has(row.sourceUrl)) sources.set(row.sourceUrl, { title: row.sourceName, url: row.sourceUrl, as_of: row.sourceDate ?? "unknown" });
  }
  function sourceLink(row: Evidence) {
    add(row);
    const label = row.sourceName.replace(/[\[\]]/g, "");
    return citationLink(row.sourceUrl) ? ` [${label}](${row.sourceUrl})` : "";
  }
  function records(evidence: readonly Evidence[]) {
    const listed = new Set<string>();
    return evidence.flatMap((row) => {
      if (!row.personId || listed.has(row.personId)) return [];
      listed.add(row.personId);
      return [`- ${row.personName} · ${row.kind === "vote" ? "Official record" : "Candidate says"} · ${row.text}${sourceLink(row)}`];
    });
  }
  function answer(lines: string[]): ChatAnswer {
    return { answer_markdown: lines.join("\n\n"), sources: [...sources.values()], refused: false };
  }

  if (raceIds.length > 1) {
    const bases = raceIds.flatMap((id) => {
      const basis = compareBasis(id);
      if (!basis) return [];
      const names = people.filter((person) => person.raceId === id);
      return [{ basis: selectCandidates(basis, names.map((person) => person.id)), names }];
    });
    const focused = topic ? bases.map((entry) => ({ ...entry, basis: comparisonOnTopic(entry.basis, topic) })) : null;
    const matching = focused?.every(({ basis }) => candidatesWithEvidence(basis) > 0) ? focused : null;
    const lines = (matching ?? bases).flatMap(({ basis, names }) => {
      const list = records(basis.evidence);
      const ballot = basis.evidence.find((row) => !row.personId);
      if (ballot) add(ballot);
      return [`## ${basis.title}`, ...(names.length ? [names.map((person) => person.name).join(", ")] : []),
        ...(list.length ? [list.join("\n")] : []), `[Compare this race](/races/${basis.raceId}/compare)`];
    });
    return { answer: answer([topic && !matching ? REFUSALS.topic : "Here are the candidate records for each race.", ...lines]) };
  }

  const [raceId] = raceIds;
  const basis = compareBasis(raceId);
  if (!basis) return null;
  const personIds = people.length > 1 ? people.map((person) => person.id) : undefined;
  const result = await service?.handle(raceId, clientKey, personIds, topic);
  const selected = selectCandidates(basis, personIds);
  const focused = !result && topic ? comparisonOnTopic(selected, topic) : null;
  const summary = result?.body ?? (focused && candidatesWithEvidence(focused) >= 2
    ? recordsOnlySummary(focused, null)
    : recordsOnlySummary(selected, topic ? REFUSALS.topic : null));
  const byId = new Map([...basis.evidence.filter((row) => !row.personId), ...summary.evidence].map((row) => [row.id, row]));
  function claims(rows: readonly Claim[]) {
    return rows.map((claim) => {
      const links = new Set(claim.cites.flatMap((cite) => {
        const row = byId.get(cite);
        return row ? [sourceLink(row)] : [];
      }));
      return `- ${claim.text}${[...links].join("")}`;
    }).join("\n");
  }
  const lines = [summary.notice ?? "", "## What to know", claims(summary.know)];
  if (summary.mode === "ai" && (summary.differ.length || summary.agree.length)) lines.push("AI summary");
  const differ = claims(summary.differ) || summary.differRefusal;
  const agree = claims(summary.agree) || summary.agreeRefusal;
  if (differ) lines.push(`## Where they differ\n${differ}`);
  if (agree) lines.push(`## Where they agree\n${agree}`);
  if (!summary.differ.length && !summary.agree.length) {
    const list = records(summary.evidence);
    if (list.length) lines.push("## Candidate records", list.join("\n"));
    lines.push(`[Compare this race](/races/${raceId}/compare)`);
  }
  return { answer: answer(lines.filter(Boolean)), headers: result?.headers, status: result?.status === 429 ? 429 : 200 };
}
