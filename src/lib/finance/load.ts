import { cache } from "react";
import { memoizeRead } from "../cache/memo";
import { createDynamoRepository } from "../data/repository";
import { formatInstant } from "../format";
import type { FinanceDirect, FinanceOutside } from "./model";
import { FINANCE_SNAPSHOT_CYCLE, FINANCE_SNAPSHOT_RETRIEVED_AT, snapshotFinance } from "./snapshot";

export type FinanceBundle = {
  cycle: number;
  origin: "table" | "snapshot" | "empty";
  notice: string | null;
  retrievedAt: string | null;
  direct: FinanceDirect[];
  outside: FinanceOutside[];
};

const readFinance = memoizeRead(
  (cycle: number) => createDynamoRepository().listFinance(cycle),
  (error) => console.error("finance read failed:", error instanceof Error ? error.name : "Error"),
);

export const loadFinance = cache(async (cycle: number): Promise<FinanceBundle> => {
  try {
    const rows = await readFinance(cycle);
    if (rows.direct.length === 0 && rows.outside.length === 0) {
      return { cycle, origin: "empty", notice: "No finance totals for this year.", retrievedAt: null, direct: [], outside: [] };
    }
    return { cycle, origin: "table", notice: null, retrievedAt: null, direct: rows.direct, outside: rows.outside };
  } catch {
    if (cycle === FINANCE_SNAPSHOT_CYCLE) {
      const snap = snapshotFinance();
      return {
        cycle,
        origin: "snapshot",
        notice: `Election commission figures retrieved ${formatInstant(FINANCE_SNAPSHOT_RETRIEVED_AT) ?? FINANCE_SNAPSHOT_RETRIEVED_AT}.`,
        retrievedAt: FINANCE_SNAPSHOT_RETRIEVED_AT,
        direct: snap.direct,
        outside: snap.outside,
      };
    }
    return {
      cycle,
      origin: "empty",
      notice: "Finance totals are unavailable.",
      retrievedAt: null,
      direct: [],
      outside: [],
    };
  }
});

export function financeForCandidate(bundle: FinanceBundle, candidateId: string): FinanceBundle {
  return {
    ...bundle,
    direct: bundle.direct.filter((row) => row.candidateId === candidateId),
    outside: bundle.outside.filter((row) => row.candidateId === candidateId),
  };
}

export function financeForCommittee(bundle: FinanceBundle, committeeId: string): FinanceBundle {
  return {
    ...bundle,
    direct: bundle.direct.filter((row) => row.committeeId === committeeId),
    outside: bundle.outside.filter((row) => row.committeeId === committeeId),
  };
}
