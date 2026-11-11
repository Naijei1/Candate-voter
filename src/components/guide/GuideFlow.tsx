"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { districtFromPoint } from "@/lib/geo/address-district";
import { findRacesByZip } from "@/lib/lookup/find-races";
import { settleZipLookup } from "@/lib/lookup/zip-view";
import { ElectionStatus } from "@/components/site/ElectionStatus";
import { partyMark } from "@/components/site/PersonMark";
import { KY_RESULTS_LINKS } from "@/lib/site/ky-results";
import { seatStatus } from "@/lib/site/seat";
import { stanceIssues, stancesFor, type Stance } from "@/lib/site/stances";

const STORAGE = "candate-guide-v1";

export type GuidePerson = {
  id: string;
  name: string;
  party: string;
  holds: boolean;
  writeIn: boolean;
  raised: string | null;
  photo: string | null;
  photoCredit: string | null;
  website: { href: string; label: string } | null;
  job: string | null;
};

export type GuideRace = {
  id: string;
  title: string;
  office: "senate" | "house";
  district: string | null;
  job: string;
  people: GuidePerson[];
};

type Choice = { kind: "lean"; candidateId: string } | { kind: "skip" };

type Saved = {
  choices: Record<string, Choice>;
  issues: string[];
};

export function GuideFlow({ races }: { races: GuideRace[]; signedIn: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const step = params.get("step") || "zip";
  const zipParam = params.get("zip") ?? "";
  const district = params.get("district");
  const raceParam = params.get("race");
  const [zip, setZip] = useState(zipParam);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [issues, setIssues] = useState<string[]>([]);
  const [sheet, setSheet] = useState<GuidePerson | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setZip(zipParam);
  }, [zipParam]);

  useEffect(() => {
    if (step === "zip" || district || !/^\d{5}$/.test(zipParam)) return;
    let cancel = false;
    void (async () => {
      const result = await settleZipLookup(findRacesByZip(zipParam, 2026));
      if (cancel || !result.ok || result.payload.state !== "KY" || result.payload.districts.length !== 1) return;
      const found = result.payload.districts[0]?.district ?? null;
      if (!found) return;
      const query = new URLSearchParams({ zip: zipParam, district: found, step });
      if (raceParam) query.set("race", raceParam);
      router.push(`/ballot?${query.toString()}`);
    })();
    return () => {
      cancel = true;
    };
  }, [district, raceParam, router, step, zipParam]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as Saved | null;
      if (!saved) return;
      setChoices(saved.choices || {});
      setIssues(saved.issues || []);
    } catch {
      /* keep defaults */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify({ choices, issues }));
  }, [choices, issues]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, raceParam]);

  function push(next: { step?: string; zip?: string; district?: string | null; race?: string | null }) {
    const query = new URLSearchParams();
    const nextZip = next.zip ?? zipParam;
    const nextDistrict = next.district === undefined ? district : next.district;
    const nextStep = next.step ?? step;
    const nextRace = next.race === undefined ? raceParam : next.race;
    if (nextZip) query.set("zip", nextZip);
    if (nextDistrict) query.set("district", nextDistrict);
    if (nextStep && nextStep !== "zip") query.set("step", nextStep);
    if (nextRace && nextStep !== "zip" && nextStep !== "races") query.set("race", nextRace);
    const text = query.toString();
    router.push(text ? `/ballot?${text}` : "/ballot");
  }

  const ballot = useMemo(
    () => races.filter((race) => race.office === "senate" || race.district === district),
    [races, district],
  );
  const current = ballot.find((race) => race.id === raceParam) ?? ballot[0];
  const stepNumber = step === "zip" ? 1 : step === "compare" || step === "list" ? 3 : 2;

  async function lookupZip() {
    const entered = zip.trim();
    if (!entered) {
      setNote("Enter your 5-digit ZIP code.");
      return;
    }
    if (!/^\d{5}$/.test(entered)) {
      setNote("We couldn't find that ZIP. Enter a 5-digit Kentucky ZIP, like 40202.");
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const result = await settleZipLookup(findRacesByZip(entered, 2026));
      if (!result.ok) {
        setNote("We couldn't find that ZIP. Enter a 5-digit Kentucky ZIP, like 40202.");
        return;
      }
      if (result.payload.state !== "KY") {
        setNote("That ZIP is outside Kentucky. This guide covers Kentucky only.");
        return;
      }
      if (result.payload.districts.length !== 1) {
        setNote("That ZIP covers more than one district. Pick it on the map.");
        return;
      }
      const found = result.payload.districts[0]?.district ?? null;
      if (!found) {
        setNote("We couldn't find that ZIP. Enter a 5-digit Kentucky ZIP, like 40202.");
        return;
      }
      push({ step: "races", zip: entered, district: found, race: null });
    } finally {
      setBusy(false);
    }
  }

  async function shareLocation() {
    setBusy(true);
    setNote(null);
    if (!navigator.geolocation) {
      setNote("This browser cannot share a location. Enter a ZIP.");
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const found = await districtFromPoint({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setBusy(false);
        if (!found.ok) {
          setNote(found.message);
          return;
        }
        push({ step: "races", district: found.district, race: null });
      },
      () => {
        setBusy(false);
        setNote("Location was not shared. It was not saved.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  function choose(raceId: string, choice: Choice) {
    setChoices((currentChoices) => ({ ...currentChoices, [raceId]: choice }));
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-28">
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <p className="mb-2 text-sm font-semibold text-slate-700">Step {stepNumber} of 3</p>
        <p className="ballot-crumbs mb-2">
          <button type="button" className="underline" onClick={() => push({ step: "zip", race: null })}>Your district</button>
          <span aria-hidden="true"> › </span>
          <button type="button" className="underline" onClick={() => push({ step: "races", race: null })}>Your races</button>
          <span aria-hidden="true"> › </span>
          <span>Compare</span>
        </p>
        <Progress value={(stepNumber / 3) * 100} label={`Step ${stepNumber} of 3`} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {step === "zip" ? (
            <section>
              <h1 ref={headingRef} tabIndex={-1} className="mb-2 text-4xl font-semibold tracking-tight text-slate-950">Where do you vote?</h1>
              <p className="mb-6 text-lg text-slate-600">Kentucky only. A ZIP or your location finds a U.S. House district. It is not your full local ballot.</p>
              <Card className="space-y-4">
                <label className="block text-lg font-medium" htmlFor="guide-zip">
                  ZIP code
                  <input id="guide-zip" className="mt-2 h-14 w-full rounded-2xl border border-slate-300 px-4 text-2xl" inputMode="numeric" autoComplete="postal-code" maxLength={5} pattern="[0-9]{5}" aria-invalid={note ? true : undefined} aria-describedby={note ? "zip-error" : "zip-hint"} value={zip} onChange={(event) => setZip(event.target.value)} />
                </label>
                <p id="zip-hint" className="text-slate-600">5 digits, e.g. 40202</p>
                <Button className="w-full" disabled={busy} onClick={() => void lookupZip()}>
                  See my ballot
                </Button>
                <Button variant="ghost" className="w-full" disabled={busy} onClick={() => void shareLocation()}>
                  <MapPin className="size-5" /> Use my location
                </Button>
                <p className="text-center">
                  <Link href="/#map">Pick a district on the map</Link>
                </p>
                {note ? <p id="zip-error" role="alert" className="font-semibold text-[#9b1c2e]">{note}</p> : null}
              </Card>
              <div className="mt-4">
                <ElectionStatus />
              </div>
            </section>
          ) : null}

          {step === "races" ? (
            <section>
              <h1 ref={headingRef} tabIndex={-1} className="mb-2 text-4xl font-semibold tracking-tight">Your ballot</h1>
              {district ? (
                <>
                  <p className="mb-4 text-lg text-slate-700">{`You're in KY-${district.padStart(2, "0")}. You'll vote on ${ballot.length} federal races.`}</p>
                  <p className="mb-4">It is not your full local ballot.</p>
                </>
              ) : (
                <p className="mb-4">Go back and add a ZIP so this list is your U.S. House district plus the Senate race.</p>
              )}
              <div className="space-y-4">
                {ballot.map((race) => (
                  <button key={race.id} className="choice-card" type="button" disabled={!district} onClick={() => push({ step: "race", race: race.id })}>
                    <span>
                      <span className="block text-2xl font-semibold">{race.title}</span>
                      <span className="mt-1 block text-slate-700">
                        {!race.people.some((person) => person.holds) ? "Open seat: no current officeholder is running. " : ""}
                        {race.people.length} people on the November list
                      </span>
                    </span>
                    <span className="view-label">See the candidates <ChevronRight className="inline size-5" aria-hidden /></span>
                  </button>
                ))}
              </div>
              <p className="mt-4"><a href={KY_RESULTS_LINKS[1].href}>See official results</a></p>
            </section>
          ) : null}

          {step === "race" && current ? (
            <section>
              <h1 ref={headingRef} tabIndex={-1} className="mb-1 text-3xl font-semibold">{current.title}</h1>
              <p className="mb-4 text-slate-600">{current.people.length} candidates. {current.job}</p>
              <p className="mb-4"><Link href={`/races/${current.id}/compare?zip=${zipParam}&district=${district ?? ""}`}>Compare all {current.people.length} side by side</Link></p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {current.people.map((row) => {
                  const choice = choices[current.id];
                  const leaned = choice?.kind === "lean" && choice.candidateId === row.id;
                  const openSeat = !current.people.some((person) => person.holds);
                  return (
                  <Card key={row.id} className={leaned ? "ring-2 ring-[#1e3a8a]" : ""}>
                    <PersonFace person={row} openSeat={openSeat} />
                    <p className="mt-3 text-slate-800">{row.job ?? "No job line is stored."}</p>
                    <ul className="mt-3 space-y-2 text-slate-800">
                      <li>{row.raised ? `Raised ${row.raised}` : "No money total is stored."}</li>
                      <li>{topFact(row.id)}</li>
                    </ul>
                    <p className="mt-3">
                      <Link href={`/candidates/${row.id}`}>View</Link>
                      {" · "}
                      <button className="underline" type="button" onClick={() => setSheet(row)}>More</button>
                    </p>
                    <div className="mt-5 grid gap-3">
                      <Button onClick={() => choose(current.id, { kind: "lean", candidateId: row.id })}>{leaned ? "Saved" : "Save for later"}</Button>
                      <Button variant="ghost" onClick={() => choose(current.id, { kind: "skip" })}>Skip</Button>
                    </div>
                  </Card>
                  );
                })}
              </div>
              <p className="mt-6"><button type="button" className="underline" onClick={() => push({ step: "list" })}>Make a printable list</button></p>
            </section>
          ) : null}

          {step === "list" ? (
            <section>
              <h1 className="mb-2 text-4xl font-semibold">What matters to you?</h1>
              <p className="mb-4 text-lg text-slate-600">Optional. This is not a recommendation. It only counts issues where a sourced stance is on file.</p>
              <div className="flex flex-wrap gap-2">
                {stanceIssues().map((issue) => {
                  const on = issues.includes(issue.id);
                  return (
                    <button key={issue.id} type="button" className={`min-h-11 rounded-full px-4 ${on ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-900 ring-1 ring-slate-300"}`} onClick={() => setIssues((currentIssues) => on ? currentIssues.filter((id) => id !== issue.id) : [...currentIssues, issue.id])}>
                      {issue.label}
                    </button>
                  );
                })}
              </div>
              <ul className="mt-4 space-y-1 text-sm text-slate-600">
                {issues.map((issueId) => {
                  const label = stanceIssues().find((issue) => issue.id === issueId)?.label ?? issueId;
                  const withNotes = ballot.reduce((count, race) => count + race.people.filter((row) => stancesFor(row.id).some((stance) => stance.issueId === issueId)).length, 0);
                  const total = ballot.reduce((count, race) => count + race.people.length, 0);
                  return <li key={issueId}>{label}: {withNotes} of {total} people on your ballot have a sourced note.</li>;
                })}
              </ul>
              <p className="mt-6 text-slate-600">Optional. This is not a recommendation.</p>
            </section>
          ) : null}

        </motion.div>
      </AnimatePresence>

      <Sheet open={sheet != null} onOpenChange={(open) => { if (!open) setSheet(null); }}>
        {sheet ? (
          <SheetContent title={sheet.name}>
            <PersonFace person={sheet} openSeat={!sheet.holds} />
            <p className="mt-3">{sheet.party}</p>
            <p className="mt-3">{sheet.raised ? `Raised ${sheet.raised}` : "No money total is stored."}</p>
            <ul className="mt-4 space-y-3">
              {stancesFor(sheet.id).map((stance) => (
                <li key={stance.issueId}>
                  <StanceLine stance={stance} />
                </li>
              ))}
              {stancesFor(sheet.id).length === 0 ? <li>No public stance found.</li> : null}
            </ul>
            <p className="mt-4">
              <Link className="font-semibold text-[#1e3a8a]" href={`/candidates/${sheet.id}`}>Filings, spending by other groups, and news</Link>
            </p>
          </SheetContent>
        ) : null}
      </Sheet>
      {step !== "zip" ? (
        <div className="ballot-bar">
          <p className="ballot-crumbs">Step {stepNumber} of 3 · Your district › Your races › Compare</p>
          <div className="ballot-actions">
            <Button variant="ghost" onClick={() => router.back()}>Back</Button>
            <Button onClick={() => {
              if (step === "races" && ballot[0]) {
                push({ step: "race", race: ballot[0].id });
                return;
              }
              if (step === "race" && current) {
                const index = ballot.findIndex((race) => race.id === current.id);
                const nextRace = ballot[index + 1];
                if (nextRace) {
                  push({ step: "race", race: nextRace.id });
                  return;
                }
                router.push(`/races/${current.id}/compare?zip=${zipParam}&district=${district ?? ""}`);
              }
            }}>{step === "race" && current && ballot.findIndex((race) => race.id === current.id) < ballot.length - 1 ? `Next race: ${ballot[ballot.findIndex((race) => race.id === current.id) + 1]?.title ?? "Next"}` : step === "race" ? "Compare side by side" : "Next"}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function topFact(id: string): string {
  const stance = stancesFor(id)[0];
  if (!stance) return "No public stance found.";
  const label = stanceIssues().find((issue) => issue.id === stance.issueId)?.label ?? "Issue";
  return `${label}: ${stance.text}`;
}

function StanceLine({ stance }: { stance: Stance }) {
  return (
    <p>
      {stance.text}{" "}
      <a className="text-[#1e3a8a]" href={stance.sourceUrl}>{stance.sourceName}</a>
      <span className="text-slate-500"> · {stance.sourceDate}</span>
    </p>
  );
}

function PersonFace({ person, openSeat }: { person: GuidePerson; openSeat: boolean }) {
  const mark = partyMark(person.party);
  const status = seatStatus({ holds: person.holds, writeIn: person.writeIn, openSeat });
  return (
    <div>
      {person.photo ? (
        <img src={person.photo} alt="" width={160} height={160} className="size-40 rounded-full object-cover object-top" />
      ) : (
        <div className={`person-initials lg ${mark.tone}`} aria-hidden>
          {initials(person.name)}
        </div>
      )}
      <h2 className="mt-3 text-2xl font-semibold">{person.name}</h2>
      <div className="mt-1 flex flex-wrap gap-2">
        <Badge tone={partyTone(person.party)}>{mark.letter} · {person.party}</Badge>
        {status ? <Badge>{status}</Badge> : null}
      </div>
      {person.photoCredit ? <p className="mt-1 text-sm text-slate-600">{person.photoCredit}</p> : null}
      {person.website ? <p className="mt-1"><a href={person.website.href}>{person.website.label}</a></p> : null}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.replace(/["“”]/g, "").split(/\s+/).filter((part) => /^[A-Za-z]/.test(part));
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

function partyTone(party: string): "dem" | "rep" | "other" | "slate" {
  if (/democrat/i.test(party)) return "dem";
  if (/republican/i.test(party)) return "rep";
  if (/write-in|independent|libertarian|kentucky/i.test(party)) return "other";
  return "slate";
}
