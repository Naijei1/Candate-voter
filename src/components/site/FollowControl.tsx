"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FollowsResponse } from "@/lib/api/v1-types";
import { withBasePath } from "@/lib/base-path";
import type { FollowType } from "@/lib/users/follows";

export function FollowControl({ what, targetId, signedIn, returnPath }: {
  what: FollowType;
  targetId: string;
  signedIn: boolean;
  returnPath: string;
}) {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(signedIn);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState(false);
  const endpoint = withBasePath("/api/v1/me/follows");
  const signIn = `/sign-in?returnTo=${encodeURIComponent(returnPath)}`;
  const label = what === "race" ? "Follow this race" : what === "candidate" ? "Follow this candidate" : "Follow Kentucky";

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    fetch(endpoint).then(async (response) => {
      if (!active) return;
      if (response.status === 401) setExpired(true);
      if (!response.ok) throw new Error("Follow status unavailable");
      const { follows } = await response.json() as FollowsResponse;
      if (active) setFollowing(follows.some((row) => row.targetId === targetId && row.targetType === what));
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [endpoint, signedIn, targetId, what]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(false);
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
      if (!response.ok) throw new Error("Follow update unavailable");
      setFollowing(!following);
    } catch {
      setError(true);
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
      {error ? <p className="hint" role="status">Could not update this follow.</p> : null}
    </div>
  );
}
