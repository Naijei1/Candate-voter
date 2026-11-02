import type { FinanceDirect, FinanceOutside, TotalsWatermark } from "../finance/model";
import type { Candidate, Filing, IngestWatermark, Race } from "../types";
import { raceMatchesCycle } from "./cycle-match";
import type { CandidateUpsertResult, CorrectionStatus, StoredCorrection, VoterRepository } from "./repository";

/**
 * In-memory store with the same keys and monotonic candidate rule as DynamoDB.
 * Used by `--dry-run` and tests. It does not open a network connection.
 */
export class MemoryVoterRepository implements VoterRepository {
  private readonly races = new Map<string, Race>();
  private readonly candidates = new Map<string, Candidate>();
  private readonly filings = new Map<string, Filing>();
  private readonly superseded = new Set<string>();
  private watermark: IngestWatermark | null = null;
  readonly corrections: StoredCorrection[] = [];
  private readonly financeDirect: FinanceDirect[] = [];
  private readonly financeOutside: FinanceOutside[] = [];
  private totalsWatermark: TotalsWatermark | null = null;

  async upsertRace(race: Race): Promise<void> {
    this.races.set(race.raceId, clone(race));
  }

  async upsertCandidate(candidate: Candidate): Promise<CandidateUpsertResult> {
    const existing = this.candidates.get(candidate.candidateId);
    if (
      existing?.sourceLoadedAt &&
      candidate.sourceLoadedAt &&
      existing.sourceLoadedAt > candidate.sourceLoadedAt
    ) {
      return "kept-newer";
    }
    this.candidates.set(candidate.candidateId, clone(candidate));
    return "applied";
  }

  async upsertFiling(filing: Filing): Promise<void> {
    this.filings.set(`${filing.candidateId}#${filing.filingId}`, clone(filing));
  }

  async getRace(raceId: string): Promise<Race | null> {
    return clone(this.races.get(raceId) ?? null);
  }

  async listRacesByCycle(cycle: number): Promise<Race[]> {
    return [...this.races.values()]
      .filter((race) => raceMatchesCycle(race, cycle))
      .sort((a, b) => a.raceId.localeCompare(b.raceId))
      .map((race) => clone(race));
  }

  async getCandidate(candidateId: string): Promise<Candidate | null> {
    if (this.superseded.has(candidateId)) return null;
    return clone(this.candidates.get(candidateId) ?? null);
  }

  async listCandidatesForRace(raceId: string): Promise<Candidate[]> {
    return [...this.candidates.values()]
      .filter((candidate) => candidate.raceId === raceId && !this.superseded.has(candidate.candidateId))
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map((candidate) => clone(candidate));
  }

  async listFilingsForCandidate(candidateId: string): Promise<Filing[]> {
    return [...this.filings.values()]
      .filter((filing) => filing.candidateId === candidateId)
      .sort((a, b) => {
        const left = a.fecLoadTimestamp ?? "";
        const right = b.fecLoadTimestamp ?? "";
        if (left !== right) return left.localeCompare(right);
        return a.filingId.localeCompare(b.filingId);
      })
      .map((filing) => clone(filing));
  }

  async getWatermark(): Promise<IngestWatermark | null> {
    return clone(this.watermark);
  }

  async saveWatermark(watermark: IngestWatermark): Promise<void> {
    this.watermark = clone(watermark);
  }

  async saveCorrection(correction: StoredCorrection): Promise<void> {
    this.corrections.push(
      clone({
        ...correction,
        status: correction.status ?? "new",
        statusLog:
          correction.statusLog && correction.statusLog.length > 0
            ? correction.statusLog
            : [{ at: correction.createdAt, by: "public", status: "new" }],
      }),
    );
  }

  async updateCorrectionStatus(
    correctionId: string,
    status: CorrectionStatus,
    actor: string,
    at: string,
  ): Promise<StoredCorrection | null> {
    const current = this.corrections.find((item) => item.correctionId === correctionId);
    if (!current) return null;
    current.status = status;
    current.statusLog = [...current.statusLog, { at, by: actor, status }].slice(-20);
    return clone(current);
  }

  async upsertFinanceDirect(row: FinanceDirect): Promise<void> {
    const index = this.financeDirect.findIndex(
      (item) =>
        item.cycle === row.cycle &&
        item.candidateId === row.candidateId &&
        item.scope === row.scope &&
        item.committeeId === row.committeeId &&
        item.coverageEnd === row.coverageEnd &&
        item.fileNumber === row.fileNumber,
    );
    if (index >= 0) this.financeDirect[index] = clone(row);
    else this.financeDirect.push(clone(row));
  }

  async upsertFinanceOutside(row: FinanceOutside): Promise<void> {
    const index = this.financeOutside.findIndex(
      (item) =>
        item.cycle === row.cycle &&
        item.candidateId === row.candidateId &&
        item.committeeId === row.committeeId &&
        item.support === row.support,
    );
    if (index >= 0) this.financeOutside[index] = clone(row);
    else this.financeOutside.push(clone(row));
  }

  async listFinance(cycle: number): Promise<{ direct: FinanceDirect[]; outside: FinanceOutside[] }> {
    return {
      direct: this.financeDirect.filter((row) => row.cycle === cycle).map((row) => clone(row)),
      outside: this.financeOutside.filter((row) => row.cycle === cycle).map((row) => clone(row)),
    };
  }

  async getTotalsWatermark(): Promise<TotalsWatermark | null> {
    return clone(this.totalsWatermark);
  }

  async saveTotalsWatermark(watermark: TotalsWatermark): Promise<void> {
    this.totalsWatermark = clone(watermark);
  }

  async listCorrections(limit = 50): Promise<StoredCorrection[]> {
    const cap = Math.min(Math.max(Math.floor(limit), 1), 100);
    return [...this.corrections]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.correctionId.localeCompare(a.correctionId))
      .slice(0, cap)
      .map((item) => clone(item));
  }

  async markCandidateSuperseded(
    candidateId: string,
    supersededBy: string,
  ): Promise<void> {
    if (!this.candidates.has(candidateId)) return;
    if (!supersededBy.trim()) return;
    this.superseded.add(candidateId);
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
