/** One label for the person who holds the office. Open seats do not use "Challenger". */
export function seatStatus(input: { holds: boolean; writeIn: boolean; openSeat: boolean }): string | null {
  if (input.holds) return "Current officeholder";
  if (input.writeIn) return "Write-in";
  if (input.openSeat) return "Running for an open seat";
  return null;
}
