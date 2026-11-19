/** Browser-safe helpers for the money charts. No server imports here. */

export type ChartTarget = { name: string; support: number; oppose: number };

/** "supported Andy Barr" / "opposed Ed Gallrein" lines for one group, largest first. Zero amounts are left out. */
export function targetLines(committee: { targets: readonly ChartTarget[] }): { key: string; label: string; amount: number; direction: "support" | "oppose" }[] {
  const lines: { key: string; label: string; amount: number; direction: "support" | "oppose" }[] = [];
  for (const target of committee.targets) {
    if (target.support > 0) lines.push({ key: `${target.name}:s`, label: `Supported ${target.name}`, amount: target.support, direction: "support" });
    if (target.oppose > 0) lines.push({ key: `${target.name}:o`, label: `Opposed ${target.name}`, amount: target.oppose, direction: "oppose" });
  }
  return lines.sort((a, b) => b.amount - a.amount);
}

