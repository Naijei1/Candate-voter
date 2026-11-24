import type { TodayCard } from "./today";

export type ActivityGroups = {
  filings: TodayCard[];
  receipts: TodayCard[];
  spending: TodayCard[];
};

/** Keep up to 12 cards from each money group so a long filing list cannot hide receipts or spending. */
export function activityCards(groups: ActivityGroups, candidate: string): TodayCard[] {
  const forPerson = (card: TodayCard) => !candidate || card.personId === candidate;
  return [
    ...groups.filings.filter(forPerson).slice(0, 12),
    ...groups.receipts.filter(forPerson).slice(0, 12),
    ...groups.spending.filter(forPerson).slice(0, 12),
  ];
}
