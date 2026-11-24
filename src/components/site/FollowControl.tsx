"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FollowsResponse } from "@/lib/api/v1-types";
import { useSession } from "@/components/site/SessionProvider";
import { withBasePath } from "@/lib/base-path";
import { FOLLOW_LIMIT_MESSAGE, type FollowType } from "@/lib/users/follows";

const UPDATE_ERROR = "Could not update this follow.";

export function FollowControl({ what, targetId, returnPath, appearance = "button" }: {
  what: FollowType;
  targetId: string;
  returnPath: string;
  /** Pill is the state-header control. The spelled-out label stays the accessible name. */
  appearance?: "button" | "pill";
}) {
  const signedIn = useSession().signedIn;
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(signedIn);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endpoint = withBasePath("/api/v1/me/follows");
  const signIn = `/sign-in?returnTo=${encodeURIComponent(returnPath)}`;
  const label = what === "race" ? "Follow this race" : what === "candidate" ? "Follow this candidate" : "Follow Kentucky";
  const pill = appearance === "pill";
  const buttonClass = pill ? "btn btn-follow" : `btn ${following ? "btn-navy" : "btn-ghost"}`;
  const visible = pill ? (following ? "Following" : "Follow") : label;

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

  const pressedName = label.replace(/^Follow/, "Stop following");
  if (!signedIn || expired) return <Link className={pill ? "btn btn-follow" : "btn btn-ghost"} href={signIn} aria-label={pill ? label : undefined}>{pill ? <StarMark filled={false} /> : null}{pill ? "Follow" : label}</Link>;
  return (
    <div>
      <button className={buttonClass} type="button" aria-pressed={following} aria-disabled={busy} aria-label={pill ? (following ? pressedName : label) : undefined} onClick={toggle}>
        {pill ? <StarMark filled={following} /> : null}
        {visible}
      </button>
      <div role="status">{error ? <p className="hint">{error}</p> : null}</div>
    </div>
  );
}

function StarMark({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.5 9.8 5.5l4.4.4-3.3 2.9.9 4.3L8 11.2 4.2 13.1l.9-4.3L1.8 5.9l4.4-.4L8 1.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
