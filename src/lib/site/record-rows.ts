/** Rows shown before the rest move behind “Show all”. */
export const VISIBLE_ROWS = 6;

/** Splits a list into the rows shown and the rows behind “Show all”. Hiding one or two rows costs more than it saves. */
export function splitRecordRows<T>(rows: readonly T[]): { head: T[]; rest: T[] } {
  const cut = rows.length > VISIBLE_ROWS + 2 ? VISIBLE_ROWS : rows.length;
  return { head: rows.slice(0, cut), rest: rows.slice(cut) };
}
