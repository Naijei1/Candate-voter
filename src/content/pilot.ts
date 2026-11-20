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
