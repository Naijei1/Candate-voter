import data from "../../../data/ky-profiles.json";

export type ProfileLink = {
  url: string;
  kind: "campaign" | "office";
  sourceName: string;
  sourceUrl: string;
  sourceDate: string;
};

export type ProfileSource = {
  sourceName: string;
  sourceUrl: string;
  sourceDate: string;
};

export type ProfileNote = ProfileSource & { text: string };
export type CareerEntry = ProfileNote & { startYear: number; endYear?: number };
export type PriorResult = ProfileSource & {
  year: number;
  office: string;
  election: "Primary" | "General" | "Special";
  party?: string;
  outcome: "Won" | "Lost";
  votes: number;
  totalVotes: number;
};
export type SocialAccount = ProfileSource & { platform: string; url: string; kind: "campaign" | "office" };

export type ProfileVote = ProfileSource & {
  bill: string;
  date: string;
  vote: string;
  title: string;
  roll: number;
  lawUrl?: string;
  lawSigned?: string;
};

export type KyProfile = {
  website: ProfileLink | null;
  bio: ProfileNote | null;
  endorsements: ProfileNote[];
  votes: ProfileVote[];
  career: CareerEntry[];
  education: ProfileNote[];
  results: PriorResult[];
  social: SocialAccount[];
};

const empty: KyProfile = {
  website: null, bio: null, endorsements: [], votes: [], career: [], education: [], results: [], social: [],
};
const byId = data.candidates as Record<string, Partial<KyProfile>>;

export const profileVoteSelection = { rule: data.voteSelection, checkedOn: data.checkedOn };

export function profileFor(candidateId: string): KyProfile {
  return { ...empty, ...byId[candidateId] };
}

export function electionLabel(result: PriorResult): string {
  return `${result.office} ${result.election.toLowerCase()}${result.party ? ` (${result.party})` : ""}`;
}

export function careerTimeline(profile: Pick<KyProfile, "career" | "results">): CareerEntry[] {
  const campaigns = profile.results.map((result) => ({
    startYear: result.year,
    text: `${result.outcome} · ${electionLabel(result)}`,
    sourceName: result.sourceName,
    sourceUrl: result.sourceUrl,
    sourceDate: result.sourceDate,
  }));
  return [...profile.career, ...campaigns].sort((a, b) => b.startYear - a.startYear);
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
