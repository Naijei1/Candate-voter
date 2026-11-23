import Link from "next/link";
import { calendarDay, dayLabel } from "@/lib/format";

export function DatasetUpdated({ date }: { date: string | null | undefined }) {
  const day = date?.trim() ? calendarDay(date) : null;
  const label = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? dayLabel(day) : null;
  return (
    <p className="hint">
      {day && label ? <>Updated <time dateTime={day}>{label}</time> · </> : null}
      <Link href="/sources">Sources</Link>
    </p>
  );
}
