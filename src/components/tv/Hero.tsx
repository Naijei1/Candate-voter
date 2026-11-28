import { US_HERO } from "@/lib/geo/us-hero";
import { enabledStates } from "@/lib/states";
import { HeroPause, HeroSavedLine } from "./client/HeroBits";
import { YoursCta } from "./client/Yours";

/** Home hero: the country drawn in thin lines with the available state lit. CSS only; still when motion is reduced. */
export function Hero() {
  const covered = enabledStates();
  const first = covered[0];
  return (
    <section className="hero hero-b" id="hero" aria-labelledby="h-hero">
      <HeroPause targetId="hero" />
      <div className="hbg hbg-us" aria-hidden="true">
        <div className="usmap">
          <div className="glow" />
          <svg viewBox={US_HERO.viewBox} preserveAspectRatio="xMidYMid meet" focusable="false">
            <path className="mesh" d={US_HERO.mesh} />
            <path className="inset" d={US_HERO.inset} />
            {US_HERO.traces.map((d, index) => (
              <path key={index} className="tr" style={{ ["--i" as string]: index }} pathLength={100} d={d} />
            ))}
            <path className="ky" d={US_HERO.focus.d} />
          </svg>
          <span className="live">
            <i />
            {covered.map((state) => state.name).join(" and ")} races available
          </span>
        </div>
      </div>
      <div className="wrap hero-g">
        <div className="hero-c">
          <h1 id="h-hero" className="t-display">
            <span>Your U.S. Senate</span> <span>and House races</span>
          </h1>
          <p className="hero-s">{first ? `${first.name}, ${first.cycle}. ` : null}Pick your county to see who ran.</p>
          <div className="hero-act">
            <YoursCta className="btn hero-btn" />
          </div>
          <HeroSavedLine />
        </div>
      </div>
    </section>
  );
}
