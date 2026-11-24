import { FollowControl } from "@/components/site/FollowControl";
import { StateSilhouette } from "@/components/site/StateSilhouette";
import { stateConfig, statePath } from "@/lib/states";

export function StateHeader({
  heading = "h2",
  headingId,
}: {
  heading?: "h1" | "h2";
  headingId?: string;
}) {
  const state = stateConfig();
  const Title = heading;
  return (
    <div className="state-header">
      <StateSilhouette code={state.code} />
      <Title id={headingId}>{state.name}</Title>
      <FollowControl appearance="pill" what="jurisdiction" targetId={state.code} returnPath={statePath(state)} />
    </div>
  );
}
