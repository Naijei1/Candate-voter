import data from "../../../data/ky-profiles.json";

export type ProfileLink = {
  url: string;
  kind: "campaign" | "office";
  sourceName: string;
  sourceUrl: string;
  sourceDate: string;
};

export type ProfileNote = {
  text: string;
  sourceName: string;
  sourceUrl: string;
  sourceDate: string;
};

export type ProfileVote = {
  bill: string;
  date: string;
  vote: string;
  sourceName: string;
  sourceUrl: string;
};

export type KyProfile = {
  website: ProfileLink | null;
  bio: ProfileNote | null;
  endorsements: ProfileNote[];
  votes: ProfileVote[];
};

const empty: KyProfile = { website: null, bio: null, endorsements: [], votes: [] };
const byId = data.candidates as Record<string, KyProfile>;

export function profileFor(candidateId: string): KyProfile {
  return byId[candidateId] ?? empty;
}

export function linkLabel(link: ProfileLink): string {
  return link.kind === "office" ? "Official site" : "Campaign site";
}

/** First sourced sentence. Null when no biography is stored, or the cut is too short to trust. */
export function jobLine(candidateId: string): string | null {
  const text = profileFor(candidateId).bio?.text?.trim();
  if (!text) return null;
  const sentence = firstSentence(text);
  if (sentence.length < 20) return text.length >= 20 ? text : null;
  return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
}

export function firstSentence(text: string): string {
  const abbreviation = /\b(?:[A-Z](?:\.[A-Z])+|Mr|Mrs|Ms|Dr|Sen|Rep|Gov|Jr|Sr|St|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.$/i;
  for (const match of text.matchAll(/[.!?](?=\s)/g)) {
    const end = match.index + 1;
    const sentence = text.slice(0, end);
    if (!abbreviation.test(sentence)) return sentence;
  }
  return text;
}
