"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Landmark, MapPin, Printer, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { districtFromPoint } from "@/lib/geo/address-district";
import { findRacesByZip } from "@/lib/lookup/find-races";
import { settleZipLookup } from "@/lib/lookup/zip-view";
import { matchScore, stanceIssues, stancesFor, type Stance } from "@/lib/site/stances";

const STORAGE = "candate-guide-v1";

export type GuidePerson = {
  id: string;
  name: string;
  party: string;
  holds: boolean;
  writeIn: boolean;
  raised: string | null;
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
  step: number;
  zip: string;
  district: string | null;
  choices: Record<string, Choice>;
  issues: string[];
};

export function GuideFlow({ races, signedIn }: { races: GuideRace[]; signedIn: boolean }) {
  const [step, setStep] = useState(1);
  const [zip, setZip] = useState("");
  const [district, setDistrict] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [issues, setIssues] = useState<string[]>([]);
  const [raceIndex, setRaceIndex] = useState(0);
  const [slide, setSlide] = useState(0);
  const [sheet, setSheet] = useState<GuidePerson | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as Saved | null;
      if (!saved) return;
      setStep(saved.step || 1);
      setZip(saved.zip || "");
      setDistrict(saved.district);
      setChoices(saved.choices || {});
      setIssues(saved.issues || []);
    } catch {
      /* keep defaults */
    }
  }, []);

  useEffect(() => {
    const saved: Saved = { step, zip, district, choices, issues };
    localStorage.setItem(STORAGE, JSON.stringify(saved));
  }, [step, zip, district, choices, issues]);

  const ballot = useMemo(
    () => races.filter((race) => race.office === "senate" || race.district === district),
    [races, district],
  );
  const decided = ballot.filter((race) => choices[race.id]).length;
  const current = ballot[raceIndex] ?? ballot[0];
  const person = current?.people[slide];

  async function lookupZip() {
    setBusy(true);
    setNote(null);
    try {
      const result = await settleZipLookup(findRacesByZip(zip, 2026));
      if (!result.ok) {
        setNote("That ZIP could not be matched. Try the map.");
        return;
      }
      if (result.payload.state !== "KY" || result.payload.districts.length !== 1) {
        setNote(result.payload.state === "KY" ? "That ZIP covers more than one district. Pick it on the map." : "That ZIP is outside Kentucky.");
        return;
      }
      setDistrict(result.payload.districts[0]?.district ?? null);
      setStep(2);
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
        setDistrict(found.district);
        setStep(2);
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

  function downloadSheet() {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 42px Inter, sans-serif";
    ctx.fillText("Your Kentucky ballot", 48, 80);
    ctx.font = "28px Inter, sans-serif";
    let y = 150;
    for (const race of ballot) {
      const choice = choices[race.id];
      const name = choice?.kind === "lean" ? race.people.find((row) => row.id === choice.candidateId)?.name ?? "A candidate" : "Skipped";
      ctx.fillText(`${race.title}: ${name}`, 48, y);
      y += 48;
    }
    ctx.fillStyle = "#475569";
    ctx.font = "22px Inter, sans-serif";
    ctx.fillText("Not a recommendation. November 3, 2026.", 48, y + 20);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "kentucky-ballot.png";
    link.click();
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-28">
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <p className="mb-2 text-sm font-semibold text-slate-700">Step {step} of 5</p>
        <Progress value={(step / 5) * 100} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {step === 1 ? (
            <section>
              <h1 className="mb-2 text-4xl font-semibold tracking-tight text-slate-950">Where do you vote?</h1>
              <p className="mb-6 text-lg text-slate-600">Kentucky only. A ZIP or your location finds a U.S. House district. It is not your full local ballot.</p>
              <Card className="space-y-4">
                <label className="block text-lg font-medium" htmlFor="guide-zip">
                  ZIP code
                  <input id="guide-zip" className="mt-2 h-14 w-full rounded-2xl border border-slate-300 px-4 text-2xl" inputMode="numeric" value={zip} onChange={(event) => setZip(event.target.value)} placeholder="40502" />
                </label>
                <Button className="w-full" disabled={busy} onClick={() => void lookupZip()}>
                  See my ballot
                </Button>
                <Button variant="ghost" className="w-full" disabled={busy} onClick={() => void shareLocation()}>
                  <MapPin className="size-5" /> Use my location
                </Button>
                <p className="text-center">
                  <Link className="font-semibold text-[#1e3a8a]" href="/map">Pick on the map</Link>
                </p>
                {note ? <p className="text-slate-700">{note}</p> : null}
              </Card>
              <Card className="mt-4">
                <p className="font-semibold">Election Day · Nov 3, 2026</p>
                <p className="mt-1 text-slate-700">Kentucky polls are open 6:00 a.m. to 6:00 p.m. local time.</p>
                <a className="mt-3 inline-block font-semibold text-[#1e3a8a]" href="https://www.govote.ky.gov">Find your polling place</a>
              </Card>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <h1 className="mb-2 text-4xl font-semibold tracking-tight">Your ballot</h1>
              <p className="mb-4 text-lg text-slate-600">{decided} of {ballot.length} decided{district ? ` · District ${Number(district)}` : ""}</p>
              {!district ? <p className="mb-4">Go back and add a ZIP so this list is your U.S. House district plus the Senate race.</p> : null}
              <div className="space-y-4">
                {ballot.map((race) => (
                  <Card key={race.id}>
                    <div className="mb-2 flex items-center gap-3">
                      <Landmark className="size-6 text-[#1e3a8a]" />
                      <h2 className="text-2xl font-semibold">{race.title}</h2>
                    </div>
                    <p className="text-slate-700">{race.job}</p>
                    <p className="mt-2 text-slate-600">{race.people.length} people on the November list.</p>
                    <p className="mt-1 text-sm text-slate-500">{choices[race.id] ? "Marked" : "Not decided"}</p>
                  </Card>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)}><ChevronLeft className="size-5" /> Back</Button>
                <Button className="flex-1" disabled={!district} onClick={() => { setRaceIndex(0); setSlide(0); setStep(3); }}>Start</Button>
              </div>
            </section>
          ) : null}

          {step === 3 && current && person ? (
            <section>
              <h1 className="mb-1 text-3xl font-semibold">{current.title}</h1>
              <p className="mb-4 text-slate-600">{current.job}</p>
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <button type="button" aria-label="Previous candidate" onClick={() => setSlide((value) => Math.max(0, value - 1))}><ChevronLeft /></button>
                  <p className="text-sm text-slate-500">{slide + 1} of {current.people.length}</p>
                  <button type="button" aria-label="Next candidate" onClick={() => setSlide((value) => Math.min(current.people.length - 1, value + 1))}><ChevronRight /></button>
                </div>
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-slate-200 text-xl font-semibold text-slate-800" aria-hidden>
                    {initials(person.name)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">{person.name}</h2>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge tone={partyTone(person.party)}>{person.party}</Badge>
                      {person.holds ? <Badge>Holds this office</Badge> : null}
                      {person.writeIn ? <Badge>Write-in</Badge> : null}
                    </div>
                  </div>
                </div>
                <ul className="space-y-3">
                  {stanceIssues().slice(0, 4).map((issue) => {
                    const stance = stancesFor(person.id).find((row) => row.issueId === issue.id);
                    return (
                      <li key={issue.id}>
                        <p className="font-medium">{issue.label}</p>
                        <p className="text-slate-700">{stance ? stance.text : "No public stance found"}</p>
                      </li>
                    );
                  })}
                </ul>
                <button className="mt-4 font-semibold text-[#1e3a8a]" type="button" onClick={() => setSheet(person)}>More</button>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button onClick={() => choose(current.id, { kind: "lean", candidateId: person.id })}>Leaning toward</Button>
                  <Button variant="ghost" onClick={() => choose(current.id, { kind: "skip" })}>Skip</Button>
                </div>
              </Card>
              <div className="mt-4 hidden gap-4 md:grid md:grid-cols-2">
                {current.people.slice(0, 2).map((row) => (
                  <Card key={row.id} className="text-sm text-slate-600">{row.name} · {row.party}</Card>
                ))}
              </div>
              <Button className="mt-6 w-full" disabled={!choices[current.id]} onClick={() => {
                if (raceIndex < ballot.length - 1) {
                  setRaceIndex((value) => value + 1);
                  setSlide(0);
                  return;
                }
                setStep(4);
              }}>
                {raceIndex < ballot.length - 1 ? "Next race" : "Continue"}
              </Button>
            </section>
          ) : null}

          {step === 4 ? (
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
              <Button className="mt-6 w-full" onClick={() => setStep(5)}>See my picks</Button>
            </section>
          ) : null}

          {step === 5 ? (
            <section>
              <h1 className="mb-2 text-4xl font-semibold">Your picks</h1>
              <p className="mb-4 text-slate-600">A cheat sheet, not a recommendation. {signedIn ? "Also kept on this device." : "Kept on this device until you sign in."}</p>
              <div className="space-y-4">
                {ballot.map((race) => {
                  const choice = choices[race.id];
                  const picked = choice?.kind === "lean" ? race.people.find((row) => row.id === choice.candidateId) : null;
                  return (
                    <Card key={race.id}>
                      <h2 className="text-xl font-semibold">{race.title}</h2>
                      <p className="mt-1">{picked ? `Leaning toward ${picked.name}` : choice?.kind === "skip" ? "Skipped" : "Not marked"}</p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {race.people.map((row) => {
                          const score = matchScore(row.id, issues);
                          return (
                            <li key={row.id}>
                              {row.name}: {score.enough ? `${score.percent}% of selected issues have a sourced note` : "not enough info"}
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => window.print()}><Printer className="size-5" /> Print</Button>
                <Button variant="ghost" onClick={downloadSheet}><Share2 className="size-5" /> Save image</Button>
                {signedIn ? null : <Link className="inline-flex min-h-11 items-center font-semibold text-[#1e3a8a]" href="/sign-in">Sign in to keep this</Link>}
              </div>
              <Card className="mt-4">
                <p className="font-semibold">Polling reminder</p>
                <p className="text-slate-700">Nov 3, 2026. Polls are open 6:00 a.m. to 6:00 p.m. local time. If you are in line at 6:00 p.m., you can still vote.</p>
              </Card>
            </section>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <Sheet open={sheet != null} onOpenChange={(open) => { if (!open) setSheet(null); }}>
        {sheet ? (
          <SheetContent title={sheet.name}>
            <p>{sheet.party}</p>
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
    </div>
  );
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
