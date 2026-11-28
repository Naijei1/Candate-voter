import { stateConfig } from "@/lib/states";
import { electionStatus } from "@/lib/tv/election";
import { WHERE_TO_VOTE } from "@/lib/tv/nav";
import { RESULTS_VISIBLE, winnerName } from "@/lib/tv/results-gate";
import { ExtLink } from "./ExtLink";
import { Icon } from "./Icon";

/** Link to the state's official voter lookup. The site keeps no polling-place data of its own. */
export function WhereToVote({ className = "wtv" }: { className?: string }) {
  const info = stateConfig().voterInfo;
  return (
    <ExtLink className={className} href={info.href} label={info.label} icon>
      <Icon name="pin" size="sm" />
      {WHERE_TO_VOTE}
    </ExtLink>
  );
}

/** One plain line: whether the general election is over and, for a race, who won. */
export function ElectionStatus({ raceId, where = false }: { raceId?: string; where?: boolean }) {
  const state = stateConfig();
  const status = electionStatus(state);
  const winner = raceId ? winnerName(raceId) : null;
  return (
    <div className="estat">
      <p>
        <b>{status.text}</b>
        {winner ? ` Won: ${winner}.` : status.over && RESULTS_VISIBLE && !raceId ? " Winners are marked “Won.”" : null}
      </p>
      <p className="estat-l">
        {status.over ? (
          <ExtLink href={state.results.official.href} icon>
            See official results
          </ExtLink>
        ) : null}
        {where ? <WhereToVote /> : null}
      </p>
    </div>
  );
}
