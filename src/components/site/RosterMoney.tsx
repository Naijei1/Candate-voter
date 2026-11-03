import { formatMoney } from "@/lib/finance/model";
import { KY_BALLOT_CHECKED, calendarDay, type KyFinance } from "@/lib/site/ky-ballot";

export function RosterMoney({ finance }: { finance: KyFinance }) {
  const start = finance.coverageStart ? calendarDay(finance.coverageStart) : null;
  const end = calendarDay(finance.coverageEnd);
  const window = start ? `${start} to ${end}` : `through ${end}`;
  const kind = finance.sourceLabel === "FEC committee report" ? "Reported by the main campaign committee" : "Reported to the election commission";
  return (
    <div className="card">
      <p>Raised {formatMoney(finance.receipts)}</p>
      <p>Spent {formatMoney(finance.disbursements)}</p>
      {finance.cash != null ? <p>Cash left {formatMoney(finance.cash)}</p> : null}
      {finance.debts != null ? <p>Debts {formatMoney(finance.debts)}</p> : null}
      <p className="hint">
        {kind}. {window}. Checked {calendarDay(KY_BALLOT_CHECKED)}.
      </p>
      <p>
        <a href={finance.sourceUrl}>Official total</a>
      </p>
    </div>
  );
}
