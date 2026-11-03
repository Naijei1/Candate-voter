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
