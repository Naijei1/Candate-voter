export function isKentuckyFederalRaceId(raceId: string): boolean {
  return /^\d{4}-(?:senate-KY|house-KY-0[1-6])$/.test(raceId);
}
