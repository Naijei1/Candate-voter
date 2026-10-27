// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React from "react";
import { houseBoardLine, senateBoardLine } from "@/lib/copy";
import type { StateScoreboard as Scoreboard } from "@/lib/landing";

export function StateScoreboard({ board }: { board: Scoreboard }) {
  return (
    <div data-testid="state-scoreboard" className="state-board">
      <p>{senateBoardLine(board.senateFilings)}</p>
      <p>{houseBoardLine(board.districtsWithFilings, board.districtsTotal)}</p>
    </div>
  );
}
