import { createDynamoRepository } from "../data/repository";
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

export async function loadFinance(cycle: number): Promise<FinanceBundle> {
  try {
    const rows = await createDynamoRepository().listFinance(cycle);
    if (rows.direct.length === 0 && rows.outside.length === 0) {
      return { cycle, origin: "empty", notice: "No totals stored for this cycle.", retrievedAt: null, direct: [], outside: [] };
    }
    return { cycle, origin: "table", notice: null, retrievedAt: null, direct: rows.direct, outside: rows.outside };
  } catch (error) {
    console.error("finance read failed:", error instanceof Error ? error.name : "Error");
    if (cycle === FINANCE_SNAPSHOT_CYCLE) {
      const snap = snapshotFinance();
      return {
        cycle,
        origin: "snapshot",
        notice: `Totals table unavailable. Figures below are the FEC snapshot retrieved ${FINANCE_SNAPSHOT_RETRIEVED_AT}.`,
        retrievedAt: FINANCE_SNAPSHOT_RETRIEVED_AT,
        direct: snap.direct,
        outside: snap.outside,
      };
    }
    return {
      cycle,
      origin: "empty",
      notice: "Totals could not be loaded.",
      retrievedAt: null,
      direct: [],
      outside: [],
    };
  }
}

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
