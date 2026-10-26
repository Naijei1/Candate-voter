import Link from "next/link";
import { SampleBanner } from "@/components/SampleBanner";
import { listRaces } from "@/lib/placeholders";

const officeOrder = ["president", "senate", "house"] as const;

export default function HomePage() {
  const races = listRaces();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Federal races</h1>
        <p className="max-w-2xl text-base leading-7 text-muted">
          President, Senate, and House contests will be listed here from public
          filings. The index below is a skeleton so the pages can be wired up
          later.
        </p>
      </div>
      <SampleBanner />
      <div className="space-y-8">
        {officeOrder.map((office) => {
          const group = races.filter((race) => race.office === office);
          if (group.length === 0) return null;
          const heading =
            office === "president"
              ? "President"
              : office === "senate"
                ? "Senate"
                : "House";

          return (
            <section key={office} aria-labelledby={`${office}-heading`}>
              <h2
                id={`${office}-heading`}
                className="text-sm font-semibold tracking-wide text-muted uppercase"
              >
                {heading}
              </h2>
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-card">
                {group.map((race) => (
                  <li key={race.raceId}>
                    <Link
                      href={`/races/${race.raceId}`}
                      className="flex min-h-14 flex-col justify-center px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:flex-row sm:items-baseline sm:justify-between"
                    >
                      <span className="font-medium text-ink">{race.title}</span>
                      <span className="text-sm text-muted">
                        {race.jurisdiction}
                        <span className="mx-2 text-line" aria-hidden="true">
                          ·
                        </span>
                        Sources not connected
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
