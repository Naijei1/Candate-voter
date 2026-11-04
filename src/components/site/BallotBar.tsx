"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function BallotBar({
  place,
  backHref,
  nextHref,
  nextLabel,
}: {
  place: "races" | "candidate";
  backHref: string;
  nextHref: string;
  nextLabel: string;
}) {
  const [district, setDistrict] = useState<string | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("candate-guide-v1") ?? "null") as { district?: string } | null;
      setDistrict(saved?.district ?? null);
    } catch {
      setDistrict(null);
    }
  }, []);

  function changeZip() {
    try {
      const saved = JSON.parse(localStorage.getItem("candate-guide-v1") ?? "{}") as Record<string, unknown>;
      localStorage.setItem("candate-guide-v1", JSON.stringify({ ...saved, step: 1 }));
    } catch {
      /* the home page still opens on the ZIP step */
    }
  }

  const districtLabel = district ? `KY-${String(district).padStart(2, "0")}` : "Your district";
  return (
    <nav className="ballot-bar" aria-label="Where you are on the ballot">
      <p className="ballot-crumbs">
        <Link href="/">{districtLabel}</Link>
        <span aria-hidden="true"> › </span>
        <span className={place === "races" ? "is-here" : undefined}>Races</span>
        <span aria-hidden="true"> › </span>
        <span className={place === "candidate" ? "is-here" : undefined}>Candidate</span>
      </p>
      <div className="ballot-actions">
        <Link className="btn btn-ghost" href={backHref}>Back</Link>
        <Link className="btn btn-navy" href={nextHref}>{nextLabel}</Link>
        <Link className="btn btn-ghost" href="/" onClick={changeZip}>Change ZIP</Link>
      </div>
    </nav>
  );
}
