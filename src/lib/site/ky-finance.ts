import { kyPerson } from "./ky-ballot";

export function isKentuckyFinanceRow(row: { candidateId: string; raceId: string | null }): boolean {
  // FEC IDs encode the state. Imported spending rows can inherit a race ID
  // from the surrounding report, even when their candidate is from another state.
  const fecState = /^[HS]\d([A-Z]{2})\d{5}$/i.exec(row.candidateId)?.[1];
  if (fecState) return fecState.toUpperCase() === "KY";
  return Boolean(kyPerson(row.candidateId) || /^\d{4}-(?:senate-KY|house-KY-\d{2})$/i.test(row.raceId ?? ""));
}
