import { kyBallot, kyBallotSeed } from "../site/ky-ballot";
import { latestNews, newsForNames } from "../site/ky-news";
import { stanceIssues, stancesFor } from "../site/stances";
import type { ChatAnswer, ChatRequest } from "./types";

const ISSUE = /stance|position|issue|health care|healthcare|immigration|data center|cost of living|national debt|what did|news|lantern/i;

export async function notesAnswer(request: ChatRequest): Promise<ChatAnswer | null> {
  if (!ISSUE.test(request.message)) return null;
  const race = request.raceId ? kyBallot(request.raceId) : null;
  const people = race
    ? race.people
    : namedPeople(request.message);
  if (!race && people.length === 0 && !/news|lantern/i.test(request.message)) {
    return {
      answer_markdown: "Name a Kentucky federal race and I can cite the sourced notes stored for it. I will not guess a position.",
      sources: [],
      refused: false,
      mode: "factual",
    };
  }
  const lines: string[] = [];
  const sources: ChatAnswer["sources"] = [];
  if (people.length > 0) {
    lines.push("Sourced notes only. This is not a recommendation.");
    for (const person of people) {
      const notes = stancesFor(person.id);
      if (notes.length === 0) {
        lines.push(`**${person.name}:** no public stance is stored.`);
        continue;
      }
      const bits = notes.map((note) => {
        const label = stanceIssues().find((issue) => issue.id === note.issueId)?.label ?? note.issueId;
        sources.push({ title: `${person.name}: ${note.sourceName}`, url: note.sourceUrl, as_of: note.sourceDate });
        return `${label} (${note.sourceDate}): ${note.text}`;
      });
      lines.push(`**${person.name}:** ${bits.join(" ")}`);
    }
  }
  if (/news|lantern/i.test(request.message)) {
    const stories = people.length > 0
      ? await newsForNames(people.map((person) => person.name))
      : await latestNews(5);
    if (stories.length === 0) {
      lines.push("No matching Kentucky Lantern story is loaded.");
    } else {
      lines.push("Kentucky Lantern:");
      for (const story of stories) {
        lines.push(`- [${story.title}](${story.url})${story.date ? ` (${story.date})` : ""}`);
        sources.push({ title: story.title, url: story.url, as_of: story.date ?? "unknown" });
      }
    }
  }
  if (lines.length === 0) return null;
  return {
    answer_markdown: lines.join("\n\n"),
    sources: sources.slice(0, 12),
    refused: false,
    mode: "factual",
  };
}

function namedPeople(message: string): { id: string; name: string }[] {
  const text = message.toLowerCase();
  const found: { id: string; name: string }[] = [];
  for (const candidate of kyBallotSeed().candidates) {
    const last = candidate.displayName.replace(/["“”]/g, "").split(/\s+/).at(-1)?.toLowerCase();
    if (last && last.length >= 4 && text.includes(last)) {
      found.push({ id: candidate.candidateId, name: candidate.displayName });
    }
  }
  return found;
}
