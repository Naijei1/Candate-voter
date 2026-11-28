import Link from "next/link";
import { Hero } from "@/components/tv/Hero";
import { Icon } from "@/components/tv/Icon";
import { ElectionStatus } from "@/components/tv/Status";
import { stateConfig, statePath } from "@/lib/states";

export const revalidate = 3600;

const SOURCES = ["Kentucky State Board of Elections", "Kentucky Secretary of State", "Federal Election Commission", "Clerk of the U.S. House", "U.S. Census Bureau"];

export default function HomePage() {
  const state = stateConfig();
  return (
    <>
      <Hero />

      <section className="band hstat" aria-label="Election status">
        <div className="wrap">
          <ElectionStatus where />
        </div>
      </section>

      <section className="wrap section" aria-labelledby="h-pick">
        <h2 id="h-pick" className="sec-t">
          Which county do you vote in?
        </h2>
        <p className="sec-sub">Tap it to see your races.</p>
        <ul className="pick" role="list">
          {state.quickCounties.map((county) => (
            <li key={county}>
              <Link className="chip" href={`/ballot?county=${encodeURIComponent(county)}`}>
                {county}
              </Link>
            </li>
          ))}
          <li>
            <Link className="chip more" href="/ballot">
              Another county
              <Icon name="right" size="sm" />
            </Link>
          </li>
        </ul>
        <p className="pick-all">
          <Link href={statePath(state)}>See all {state.name} races</Link>
        </p>
      </section>

      <section className="band trust" aria-labelledby="h-trust">
        <div className="wrap trust-g">
          <div>
            <h2 id="h-trust" className="sec-t sm">
              Where our facts come from
            </h2>
          </div>
          <ul className="srcs">
            {SOURCES.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
          <p className="trust-l">
            <Link href="/sources">All sources</Link>
          </p>
        </div>
      </section>
    </>
  );
}
