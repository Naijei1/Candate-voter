import type { Metadata } from "next";
import { Crumbs } from "@/components/tv/bits";
import { Icon } from "@/components/tv/Icon";
import { stateConfig } from "@/lib/states";

export const metadata: Metadata = { alternates: { canonical: "/measures" }, title: "Ballot measures" };

const TYPES = ["Constitutional amendment", "Proposition", "Referendum", "Retention question"];
const SLOTS = ["Official title", "Official text", "Plain-English summary", "A yes vote means", "A no vote means", "Fiscal estimate", "Arguments for", "Arguments against"];

export default function MeasuresPage() {
  const state = stateConfig();
  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Ballot measure" }]} />
      <p className="demo">
        <Icon name="info" size="sm" />
        <span>
          <b>Example layout.</b> No {state.cycle} statewide measure on file.
        </span>
      </p>
      <h1 className="t-h1 pt">Ballot measure</h1>
      <p className="lede">Where a certified measure will appear.</p>
      <section className="mtypes" aria-labelledby="h-mt">
        <h2 id="h-mt" className="mt-h">
          Measure types
        </h2>
        <dl>
          {TYPES.map((type) => (
            <div key={type}>
              <dt>{type}</dt>
              <dd />
            </div>
          ))}
        </dl>
      </section>
      <div className="mgrid">
        {SLOTS.map((slot) => (
          <div className="mslot" key={slot}>
            <h2>{slot}</h2>
          </div>
        ))}
      </div>
      <section className="sec" aria-labelledby="h-jud">
        <div className="sec-head">
          <div>
            <h2 id="h-jud" className="sec-t">
              Judicial and school-board contests
            </h2>
          </div>
        </div>
        <p className="none">Not covered. We cover federal races only.</p>
      </section>
    </div>
  );
}
