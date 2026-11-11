/** One label for every person. Open seats do not use "Challenger". */
export function seatStatus(input: { holds: boolean; writeIn: boolean; openSeat: boolean }): string {
  if (input.holds) return "Current officeholder";
  if (input.writeIn) return "Write-in";
  return "On the November ballot";
}

export function openSeatLine(anyoneHolds: boolean): string | null {
  if (anyoneHolds) return null;
  return "Open seat: no current officeholder is running.";
}
