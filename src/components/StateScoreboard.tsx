// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React from "react";
import { houseBoardLine, senateBoardLine } from "@/lib/copy";
import type { StateScoreboard as Scoreboard } from "@/lib/landing";

export function StateScoreboard({
  board,
  senatePeople,
}: {
  board: Scoreboard;
  /** People on the statewide seat. Null while that read is still open. */
  senatePeople: number | null;
}) {
  return (
    <div data-testid="state-scoreboard" className="state-board">
      {senatePeople == null ? null : <p>{senateBoardLine(senatePeople)}</p>}
      <p>{houseBoardLine(board.districtsWithFilings, board.districtsTotal)}</p>
    </div>
  );
}
