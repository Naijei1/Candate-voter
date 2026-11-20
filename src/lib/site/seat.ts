/** One label for every person. Open seats do not use "Challenger". */
export function seatStatus(input: { holds: boolean; writeIn: boolean }): string | null {
  if (input.holds) return "Current officeholder";
  if (input.writeIn) return "Write-in";
  return null;
}

export function openSeatLine(anyoneHolds: boolean): string | null {
  if (anyoneHolds) return null;
  return "Open seat.";
}
