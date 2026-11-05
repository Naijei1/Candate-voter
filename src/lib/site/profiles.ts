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
  const normalized = text.replace(/\b(Mr|Mrs|Ms|Dr|Sen|Rep|U\.S|Nov|Sept|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Oct|Dec)\./g, "$1");
  const sentence = normalized.split(/(?<=\.)\s/)[0] ?? normalized;
  if (sentence.length < 20) return text.length >= 20 ? text : null;
  return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
}
