import { formatMoney } from "@/lib/finance/model";
import { calendarDay, type KyFinance } from "@/lib/site/ky-ballot";
import { moneyReportState } from "@/lib/site/money-status";

export function RosterMoney({ finance }: { finance: KyFinance }) {
  const start = finance.coverageStart ? calendarDay(finance.coverageStart) : null;
  const end = calendarDay(finance.coverageEnd);
  const window = start ? `${start} to ${end}` : `through ${end}`;
  if (moneyReportState(finance) === "zero") {
    return (
      <div className="card">
        <p>Reported $0</p>
        <p className="hint"><a href={finance.sourceUrl}>FEC</a> · {window}</p>
      </div>
    );
  }
  return (
    <div className="card">
      <p>Raised {formatMoney(finance.receipts)}</p>
      <p>Spent {formatMoney(finance.disbursements)}</p>
      {finance.cash != null ? <p>Cash left {formatMoney(finance.cash)}</p> : null}
      {finance.debts != null ? <p>Debts {formatMoney(finance.debts)}</p> : null}
      <p className="hint"><a href={finance.sourceUrl}>FEC</a> · {window}</p>
    </div>
  );
}
