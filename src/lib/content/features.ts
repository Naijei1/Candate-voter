/** Admin view of what the site can honestly claim. Statuses are not edited in the browser. */

export const FEATURE_STATUSES = ["working", "demo", "awaiting content", "planned"] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

export type FeatureRecord = {
  id: string;
  name: string;
  status: FeatureStatus;
  note: string;
};

export const FEATURES: readonly FeatureRecord[] = [
  { id: "form2", name: "FEC Form 2 names and filings", status: "working", note: "OpenFEC ingest about every 6 hours." },
  { id: "contests", name: "House and Senate contest list", status: "working", note: "Even-year structure plus stored filings." },
  { id: "zip", name: "ZIP to House district", status: "working", note: "Census. Not a full ballot." },
  { id: "map", name: "District shapes", status: "working", note: "Census 120th districts, January 1, 2026." },
  { id: "finance", name: "Fundraising totals", status: "working", note: "OpenFEC candidate totals and Schedule E aggregates. Not added together." },
  { id: "accounts", name: "Sign-in and saved follows", status: "working", note: "Cognito and candate-voter-users. Email delivery is planned." },
  { id: "measures", name: "Ballot measures", status: "demo", note: "Sample layout. Not a certified question." },
  { id: "polls", name: "Polls", status: "demo", note: "No pollster feed." },
  { id: "news", name: "News", status: "demo", note: "Sample cards." },
  { id: "photos", name: "Photos, biography, and issues", status: "awaiting content", note: "Not invented. Admin can upload approved images and copy." },
  { id: "legal", name: "Ownership, funding, and affiliations", status: "awaiting content", note: "Shown only after an admin saves approved text." },
  { id: "ballot", name: "Ballot qualification", status: "planned", note: "A filing is not a place on the ballot." },
  { id: "local", name: "State, county, city, judicial, and school", status: "planned", note: "No source connected." },
  { id: "alerts", name: "Alert email", status: "planned", note: "Preferences save. Nothing is sent." },
];
