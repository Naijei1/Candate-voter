"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FollowsResponse } from "@/lib/api/v1-types";
import { useSession } from "@/components/site/SessionProvider";
import { withBasePath } from "@/lib/base-path";
import { FOLLOW_LIMIT_MESSAGE, type FollowType } from "@/lib/users/follows";

const UPDATE_ERROR = "Could not update this follow.";

export function FollowControl({ what, targetId, returnPath }: {
  what: FollowType;
  targetId: string;
  returnPath: string;
}) {
  const signedIn = useSession().signedIn;
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(signedIn);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endpoint = withBasePath("/api/v1/me/follows");
  const signIn = `/sign-in?returnTo=${encodeURIComponent(returnPath)}`;
  const label = what === "race" ? "Follow this race" : what === "candidate" ? "Follow this candidate" : "Follow Kentucky";

  useEffect(() => {
    if (!signedIn) return;
    setBusy(true);
    let active = true;
    fetch(endpoint).then(async (response) => {
      if (!active) return;
      if (response.status === 401) setExpired(true);
      if (!response.ok) throw new Error("Follow status unavailable");
      const { follows } = await response.json() as FollowsResponse;
      if (active) setFollowing(follows.some((row) => row.targetId === targetId && row.targetType === what));
    }).catch(() => { if (active) setError(UPDATE_ERROR); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [endpoint, signedIn, targetId, what]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: following ? "DELETE" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType: what, targetId }),
      });
      if (response.status === 401) {
        window.location.assign(withBasePath(signIn));
        return;
      }
      if (response.status === 409) {
        setError(FOLLOW_LIMIT_MESSAGE);
        return;
      }
      if (!response.ok) throw new Error("Follow update unavailable");
      setFollowing(!following);
    } catch {
      setError(UPDATE_ERROR);
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn || expired) return <Link className="btn btn-ghost" href={signIn}>{label}</Link>;
  return (
    <div>
      <button className={`btn ${following ? "btn-navy" : "btn-ghost"}`} type="button" aria-pressed={following} aria-disabled={busy} onClick={toggle}>
        {label}
      </button>
      <div role="status">{error ? <p className="hint">{error}</p> : null}</div>
    </div>
  );
}
