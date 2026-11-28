/** Party tags and role lines used on cards, profiles and tables. */

export type PartyKey = "rep" | "dem" | "ind" | "lib" | "kp" | "wi" | "oth";

export type PartyInfo = {
  key: PartyKey;
  /** Tag text: the full party name, never an abbreviation. */
  tag: string;
  /** Spoken name for the tag. */
  name: string;
  /** Adjective used in "Republican nominee". */
  adjective: string;
};

const TABLE: Record<PartyKey, PartyInfo> = {
  rep: { key: "rep", tag: "Republican", name: "Republican", adjective: "Republican" },
  dem: { key: "dem", tag: "Democratic", name: "Democratic", adjective: "Democratic" },
  ind: { key: "ind", tag: "Independent", name: "Independent", adjective: "Independent" },
  lib: { key: "lib", tag: "Libertarian", name: "Libertarian", adjective: "Libertarian" },
  kp: { key: "kp", tag: "Kentucky Party", name: "Kentucky Party", adjective: "Kentucky Party" },
  wi: { key: "wi", tag: "Write-in", name: "Write-in", adjective: "Write-in" },
  oth: { key: "oth", tag: "Other party", name: "Other party", adjective: "Other party" },
};

export function partyInfo(party: string | null | undefined): PartyInfo {
  const text = (party ?? "").toLowerCase();
  if (/write-?in/.test(text)) return TABLE.wi;
  if (/republican|^rep$|^r$|gop/.test(text)) return TABLE.rep;
  if (/democrat|^dem$|^d$/.test(text)) return TABLE.dem;
  if (/libertarian|^lib$/.test(text)) return TABLE.lib;
  if (/kentucky party/.test(text)) return TABLE.kp;
  if (/independent|^ind$/.test(text)) return TABLE.ind;
  return TABLE.oth;
}

/** "Republican nominee", "Independent candidate", "Write-in candidate". */
export function roleLine(party: string | null | undefined): string {
  const info = partyInfo(party);
  if (info.key === "wi") return "Write-in candidate";
  if (info.key === "ind" || info.key === "oth") return `${info.adjective} candidate`;
  return `${info.adjective} nominee`;
}

export function initials(name: string): string {
  const words = name.replace(/"[^"]*"/g, " ").replace(/\b[A-Z]\.\s*/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0][0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

/** Last word of a name, without suffixes, for "Compare Alvarado and Dembo". */
export function lastName(name: string): string {
  const words = name.replace(/"[^"]*"/g, " ").split(/\s+/).filter((word) => word && !/^(jr|sr|ii|iii|iv)\.?$/i.test(word));
  return words[words.length - 1] ?? name;
}
