/**
 * Demonstration copy for Phase 1. None of this is a filing, a poll, or a ballot question.
 * Public pages must show a Sample or Preview mark next to it.
 */

export const SAMPLE_MEASURE = {
  path: "/measures/example-kentucky",
  title: "Sample ballot-measure layout",
  eyebrow: "Demonstration. This is not a certified 2026 Kentucky ballot question.",
  officialTitle: "Sample constitutional amendment (layout only)",
  plain:
    "This paragraph shows where a plain-English explanation will go. It does not describe a real proposal.",
  yes: "A yes vote would be explained here, in the words of the official text, once a real measure is sourced.",
  no: "A no vote would be explained here the same way. This sample does not change any law.",
  support: "Supporter arguments will be quoted from a named source. This sentence is not one of them.",
  oppose: "Opponent arguments will be quoted from a named source. This sentence is not one of them.",
  fiscal: "No fiscal estimate is attached to this sample. Uncertainty would be stated when a real estimate exists.",
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
    prompt: "What did this candidate say in the latest debate?",
    kind: "Sample quotation",
    body: "“This sentence is placeholder copy, not a statement by any candidate.”",
    source: "Sample layout, October 30, 2026. Not a transcript.",
  },
  {
    id: "summary",
    prompt: "How do their education positions compare?",
    kind: "Sample summary",
    body: "A sourced comparison would name the record and its date. No education positions are on file, so this prototype does not summarize any.",
    source: "Sample layout, October 30, 2026. No interpretation is added.",
  },
  {
    id: "none",
    prompt: "What would this ballot amendment change?",
    kind: "No evidence",
    body: "No reliable information is available for that question. This prototype will not guess a vote, quote, endorsement, poll, or position.",
    source: "No source. Nothing was retrieved.",
  },
] as const;
