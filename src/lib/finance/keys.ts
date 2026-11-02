import { GSI1 } from "../data/keys";
import type { FinanceDirect, FinanceOutside } from "./model";

export function financePartition(cycle: number, candidateId: string): string {
  return `FINANCE#${cycle}#${candidateId}`;
}

export function financeDirectSort(row: Pick<FinanceDirect, "scope" | "coverageEnd" | "fileNumber" | "committeeId">): string {
  if (row.scope === "cycle") return "CYCLE";
  return `PERIOD#${row.coverageEnd ?? "none"}#${row.committeeId ?? "none"}#${row.fileNumber ?? "0"}`;
}

export function financeOutsideSort(row: Pick<FinanceOutside, "committeeId" | "support">): string {
  return `OUTSIDE#${row.committeeId}#${row.support === "support" ? "S" : "O"}`;
}

export function financeCyclePartition(cycle: number): string {
  return `FINANCE#${cycle}`;
}

export function toDirectItem(row: FinanceDirect): Record<string, unknown> {
  return {
    pk: financePartition(row.cycle, row.candidateId),
    sk: financeDirectSort(row),
    [GSI1.partition]: financeCyclePartition(row.cycle),
    [GSI1.sort]: `${row.candidateId}#${financeDirectSort(row)}`,
    entityType: "finance-direct",
    ...row,
    updatedAt: row.updatedAt,
  };
}

export function toOutsideItem(row: FinanceOutside): Record<string, unknown> {
  return {
    pk: financePartition(row.cycle, row.candidateId),
    sk: financeOutsideSort(row),
    [GSI1.partition]: financeCyclePartition(row.cycle),
    [GSI1.sort]: `${row.candidateId}#${financeOutsideSort(row)}`,
    entityType: "finance-outside",
    ...row,
    updatedAt: row.updatedAt,
  };
}
