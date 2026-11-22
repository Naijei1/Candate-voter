"use client";

import type { Preferences, PreferencesResponse } from "@/lib/api/v1-types";
import { withBasePath } from "@/lib/base-path";
import { validIssues } from "@/lib/users/preferences";
import { dayLabel } from "@/lib/format";
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
import { partyMark, PersonMark } from "@/components/site/PersonMark";
import { parseGuideQuery } from "@/lib/site/guide-query";
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

export function GuideFlow({ races, signedIn }: { races: GuideRace[]; signedIn: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const { step, zipParam, district, raceParam } = parseGuideQuery(params, races);
  const [zip, setZip] = useState(zipParam);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [issues, setIssues] = useState<string[]>([]);
  const [localReady, setLocalReady] = useState(false);
  const [issuesReady, setIssuesReady] = useState(false);
  const [savingIssue, setSavingIssue] = useState(false);
  const [preferenceNote, setPreferenceNote] = useState<string | null>(null);
  const savedPlace = useRef<Preferences["geography"]>(null);
  const [sheet, setSheet] = useState<GuidePerson | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setZip(zipParam || savedPlace.current?.zip || "");
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
    let active = true;
    const saved = readLocalGuide();
    setChoices(saved.choices);
    setLocalReady(true);
    if (!signedIn) {
      setIssues(saved.issues);
      setIssuesReady(true);
      return;
    }
    setIssuesReady(false);
    void (async () => {
      const response = await fetch(withBasePath("/api/v1/me/preferences"));
      if (!response.ok) throw new Error("Preferences unavailable");
      const { preferences } = await response.json() as PreferencesResponse;
      if (!active) return;
      const account = preferences.issues === null && saved.issues.length > 0
        ? await updatePreferences({ issues: saved.issues, seedIssues: true })
        : preferences;
      if (!active) return;
      setIssues(account.issues ?? []);
      if (account.issues !== null && saved.issues.length > 0) {
        writeLocalGuide({ ...readLocalGuide(), issues: [] });
      }
      savedPlace.current = account.geography;
      const accountZip = account.geography?.zip;
      if (accountZip) setZip((currentZip) => currentZip || accountZip);
      setIssuesReady(true);
    })().catch(() => { if (active) setPreferenceNote("Could not load your account preferences."); });
    return () => { active = false; };
  }, [signedIn]);

  useEffect(() => {
    if (!localReady) return;
    writeLocalGuide({ choices, issues: signedIn ? readLocalGuide().issues : issues });
  }, [choices, issues, localReady, signedIn]);

  async function chooseIssue(id: string) {
    if (!issuesReady || savingIssue) return;
    const next = issues.includes(id) ? issues.filter((issue) => issue !== id) : [...issues, id];
    if (!signedIn) {
      setIssues(next);
      return;
    }
    setPreferenceNote(null);
    setSavingIssue(true);
    try {
      setIssues((await updatePreferences({ issues: next })).issues ?? []);
    } catch {
      setPreferenceNote("Could not save your issue picks.");
    } finally {
      setSavingIssue(false);
    }
  }

  async function saveDistrict(district: string, zip: string | null) {
    if (!signedIn) return;
    try {
      const geography = { state: "KY", year: 2026, district, zip };
      savedPlace.current = (await updatePreferences({ geography })).geography;
    } catch {
      setPreferenceNote("Could not save your district.");
    }
  }

  const previousPage = useRef({ step, raceParam });
  useEffect(() => {
    if (previousPage.current.step !== step || previousPage.current.raceParam !== raceParam) headingRef.current?.focus();
    previousPage.current = { step, raceParam };
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
        setNote("Enter a Kentucky ZIP code.");
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
      void saveDistrict(found, entered);
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
        push({ step: "races", zip: "", district: found.district, race: null });
        void saveDistrict(found.district, null);
      },
      () => {
        setBusy(false);
        setNote("Location unavailable. Enter a ZIP code.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  function choose(raceId: string, choice: Choice) {
    setChoices((currentChoices) => ({ ...currentChoices, [raceId]: choice }));
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-28">
      {preferenceNote ? <p role="status">{preferenceNote}</p> : null}
      <div className="sticky top-0 z-30 mb-6 border-b border-line bg-paper py-3">
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
      {step === "zip" ? (
        <section>
          <h1 ref={headingRef} tabIndex={-1}>Where do you vote?</h1>
          <p className="mb-6 text-lg text-slate-600">Enter your ZIP code to find your races.</p>
          <Card className="space-y-4">
            <label className="block text-lg font-medium" htmlFor="guide-zip">
              ZIP code
              <input id="guide-zip" className="mt-2 h-14 w-full rounded-lg border border-slate-300 px-4 text-2xl" inputMode="numeric" autoComplete="postal-code" maxLength={5} pattern="[0-9]{5}" aria-invalid={note ? true : undefined} placeholder="40202" aria-describedby={note ? "zip-error" : undefined} value={zip} onChange={(event) => setZip(event.target.value)} />
            </label>

            <Button className="w-full" disabled={busy} onClick={() => void lookupZip()}>
              See my ballot
            </Button>
            <Button variant="ghost" className="w-full" disabled={busy} onClick={() => void shareLocation()}>
              <MapPin className="size-5" /> Use my location
            </Button>
            <p className="text-left">
              <Link href="/#map">Pick a district on the map</Link>
            </p>
            {note ? <p id="zip-error" role="alert" className="font-semibold text-error">{note}</p> : null}
          </Card>
          <div className="mt-4">
            <ElectionStatus />
          </div>
        </section>
      ) : null}

      {step === "races" ? (
        <section>
          <h1 ref={headingRef} tabIndex={-1}>Your ballot</h1>
          {district ? (
            <>
              <p className="mb-4 text-lg text-slate-700">{`You're in KY-${district.padStart(2, "0")}. You'll vote on ${ballot.length} federal races.`}</p>
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
          <h1 ref={headingRef} tabIndex={-1}>{current.title}</h1>
          <p className="mb-4 text-slate-600">{current.people.length} candidates. {current.job}</p>
          <p className="mb-4"><Link href={`/races/${current.id}/compare?zip=${zipParam}&district=${district ?? ""}`}>Compare all {current.people.length} side by side</Link></p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {current.people.map((row) => {
              const choice = choices[current.id];
              const topStance = stancesFor(row.id)[0];
              const leaned = choice?.kind === "lean" && choice.candidateId === row.id;
              return (
              <Card key={row.id} className={leaned ? "ring-2 ring-navy" : ""}>
                <PersonFace person={row} />
                {row.job ? <p className="mt-3 text-slate-800">{row.job}</p> : null}
                {row.raised ? <p className="mt-3">Raised {row.raised}</p> : null}
                {topStance ? <div className="mt-3"><StanceLine stance={topStance} /></div> : null}
                <p className="mt-3">
                  <Link href={`/candidates/${row.id}`}>View</Link>
                  {" · "}
                  <button className="underline" type="button" onClick={() => setSheet(row)}>More</button>
                </p>
                <div className="mt-4 grid gap-3">
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
          <h1>What matters to you?</h1>
          <p className="mb-4 text-lg text-slate-600">Choose issues to compare.</p>
          <div className="flex flex-wrap gap-2">
            {stanceIssues().map((issue) => {
              const on = issues.includes(issue.id);
              return (
                <button key={issue.id} type="button" className={`min-h-11 rounded-lg px-4 ${on ? "bg-navy-surface text-white" : "bg-card text-control-ink ring-1 ring-slate-300"}`} aria-pressed={on} aria-disabled={!issuesReady || savingIssue} onClick={() => void chooseIssue(issue.id)}>
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
        </section>
      ) : null}

      <Sheet open={sheet != null} onOpenChange={(open) => { if (!open) setSheet(null); }}>
        {sheet ? (
          <SheetContent title={sheet.name}>
            <PersonFace person={sheet} />
            <p className="mt-3">{sheet.party}</p>
            {sheet.raised ? <p className="mt-3">Raised {sheet.raised}</p> : null}
            <ul className="mt-4 space-y-3">
              {stancesFor(sheet.id).map((stance) => (
                <li key={stance.issueId}>
                  <StanceLine stance={stance} />
                </li>
              ))}
            </ul>
            <p className="mt-4">
              <Link className="font-semibold text-navy" href={`/candidates/${sheet.id}`}>Filings, spending by other groups, and news</Link>
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

function StanceLine({ stance }: { stance: Stance }) {
  return (
    <p>
      {stance.text}{" "}
      <a className="text-navy" href={stance.sourceUrl}>{stance.sourceName}</a>
      <span className="text-slate-500"> · {dayLabel(stance.sourceDate)}</span>
    </p>
  );
}

function PersonFace({ person }: { person: GuidePerson }) {
  const mark = partyMark(person.party);
  const status = seatStatus({ holds: person.holds, writeIn: person.writeIn });
  return (
    <div>
      <PersonMark name={person.name} photo={person.photo} size="lg" />
      <h2 className="mt-3">{person.name}</h2>
      <div className="mt-1 flex flex-wrap gap-2">
        <Badge tone={partyTone(person.party)}>{mark.letter} · {person.party}</Badge>
        {status ? <Badge>{status}</Badge> : null}
      </div>
      {person.photoCredit ? <p className="mt-1 text-sm text-slate-600">Photo: {person.photoCredit}</p> : null}
      {person.website ? <p className="mt-1"><a href={person.website.href}>{person.website.label}</a></p> : null}
    </div>
  );
}

function partyTone(party: string): "dem" | "rep" | "other" | "slate" {
  if (/democrat/i.test(party)) return "dem";
  if (/republican/i.test(party)) return "rep";
  if (/write-in|independent|libertarian|kentucky/i.test(party)) return "other";
  return "slate";
}

function readLocalGuide(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as Partial<Saved> | null;
    return { choices: saved?.choices ?? {}, issues: validIssues(saved?.issues) };
  } catch {
    return { choices: {}, issues: [] };
  }
}

function writeLocalGuide(saved: Saved) {
  try { localStorage.setItem(STORAGE, JSON.stringify(saved)); } catch { /* Storage can be disabled. */ }
}

async function updatePreferences(values: Partial<Preferences> & { seedIssues?: boolean }): Promise<Preferences> {
  const response = await fetch(withBasePath("/api/v1/me/preferences"), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!response.ok) throw new Error("Preferences unavailable");
  return ((await response.json()) as PreferencesResponse).preferences;
}
