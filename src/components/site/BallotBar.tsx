"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

const STEPS = 4;

/** One 44px row: Back, the step, and Next. */
export function BallotBar({
  step,
  backHref,
  nextHref,
  nextLabel,
  nextShort,
}: {
  step: 2 | 3 | 4;
  backHref: string;
  nextHref: string;
  nextLabel: string;
  nextShort?: string;
}) {
  const short = nextShort ?? nextLabel;
  const style = { "--guide-progress": `${(step / STEPS) * 100}%` } as CSSProperties;
  return (
    <nav className="ballot-bar" style={style} aria-label="Where you are on the ballot">
      <Link className="btn btn-ghost ballot-back" href={backHref}>Back</Link>
      <p className="ballot-step">
        <span className="sr-only">Step </span>
        {step} of {STEPS}
      </p>
      <Link className="btn btn-navy ballot-next" href={nextHref}>
        <span className="ballot-label-long">{nextLabel}</span>
        <span className="ballot-label-short">{short}</span>
      </Link>
    </nav>
  );
}
