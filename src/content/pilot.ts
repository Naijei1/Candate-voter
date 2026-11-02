/**
 * Demonstration copy for Phase 1. None of this is a filing, a poll, or a ballot question.
 * Public pages must show a Sample or Preview mark next to it.
 */

export const SAMPLE_MEASURE = {
  path: "/measures/example-kentucky",
  title: "Sample ballot measure",
  eyebrow: "Not a certified 2026 question.",
  officialTitle: "Sample amendment",
  plain: "Plain-English summary.",
  yes: "What a yes vote would do.",
  no: "What a no vote would do.",
  support: "Supporter argument, with a source.",
  oppose: "Opponent argument, with a source.",
  fiscal: "No fiscal estimate.",
} as const;

export const SAMPLE_PAC = {
  path: "/finance/committees/example-pac",
  name: "Example Civic PAC",
  type: "Sample committee type, not a registered committee",
  funding: "Disclosed funding sources would be listed from a filing. None are loaded.",
  direct:
    "Sample direct contribution: $1,000 on January 1, 2026, from Example Donor to Sample candidate A. Demonstration amounts only.",
  outside:
    "Sample outside spending: $1,000 on January 2, 2026, by Example Civic PAC about Sample candidate A. This is not money the candidate received.",
  relationship:
    "No evidence in this sample establishes which real candidates the committee supports or opposes.",
} as const;

export const SAMPLE_NEWS = [
  {
    id: "statements",
    category: "Candidate statements",
    headline: "Sample: how a candidate statement card will look",
    publisher: "Sample publisher",
    date: "October 30, 2026",
    kind: "Campaign statement",
    race: "Layout example, not a live race",
  },
  {
    id: "finance",
    category: "Campaign finance",
    headline: "Sample: how a finance update card will look",
    publisher: "Sample publisher",
    date: "October 30, 2026",
    kind: "Reporting",
    race: "Layout example, not a live race",
  },
  {
    id: "deadlines",
    category: "Election deadlines",
    headline: "Sample: how a deadline card will look",
    publisher: "Sample publisher",
    date: "October 30, 2026",
    kind: "Our analysis",
    race: "Layout example, not a live race",
  },
] as const;

export const NEWS_CATEGORIES = [
  "Candidate statements",
  "Campaign finance",
  "PAC activity",
  "Polls",
  "Debates",
  "Ballot measures",
  "Election deadlines",
] as const;

/** Prototype answers. They are format examples, not retrieval, and not about a live candidate. */
export const AI_EXAMPLES = [
  {
    id: "quote",
    prompt: "Latest debate?",
    kind: "Sample quotation",
    body: "Placeholder quote, not a real statement.",
    source: "Sample",
  },
  {
    id: "summary",
    prompt: "Education positions?",
    kind: "Sample summary",
    body: "No positions on file.",
    source: "None",
  },
  {
    id: "none",
    prompt: "What would an amendment change?",
    kind: "No evidence",
    body: "No record. Nothing guessed.",
    source: "None",
  },
] as const;
