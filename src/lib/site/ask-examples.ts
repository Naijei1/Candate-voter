import { formatInstant, httpsUrl } from "@/lib/format";

export type AskExample = {
  prompt: string;
  kind: string;
  body: string;
  sourceLabel: string;
  href: string | null;
  date: string;
  sample: boolean;
};

const SAMPLE_DATE = "October 30, 2026";

export function askExamples(
  sources: readonly { url: string | null; updatedAt: string | null }[],
): AskExample[] {
  const real = sources
    .map((source) => ({ href: httpsUrl(source.url), updatedAt: source.updatedAt }))
    .find((source) => source.href);
  const date = real ? formatInstant(real.updatedAt) ?? SAMPLE_DATE : SAMPLE_DATE;
  const filing = real
    ? { sourceLabel: "FEC filing", href: real.href, date, sample: false }
    : { sourceLabel: "Sample source", href: null, date: SAMPLE_DATE, sample: true };

  return [
    {
      prompt: "Latest debate?",
      kind: "No evidence",
      body: "No debate transcript is on file.",
      ...filing,
    },
    {
      prompt: "Education positions?",
      kind: filing.sample ? "Sample summary" : "No evidence",
      body: "No positions are on file.",
      ...filing,
    },
    {
      prompt: "What would an amendment change?",
      kind: "No evidence",
      body: "No amendment text is on file.",
      sourceLabel: "Sample source",
      href: null,
      date: SAMPLE_DATE,
      sample: true,
    },
  ];
}
