import Link from "next/link";
import { dayLabel } from "@/lib/format";

export function DatasetUpdated({ date }: { date: string | null | undefined }) {
  const day = date?.slice(0, 10);
  return (
    <p className="hint">
      {day ? <>Updated <time dateTime={day}>{dayLabel(day)}</time> · </> : null}
      <Link href="/sources">Sources</Link>
    </p>
  );
}
