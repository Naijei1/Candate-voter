"use client";

import { withBasePath } from "@/lib/base-path";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FollowType } from "@/lib/users/follows";

const LABEL: Record<FollowType, string> = {
  race: "this race",
  candidate: "this person",
  jurisdiction: "this place",
  measure: "this question",
  issue: "this topic",
};

export function FollowControl({ what, targetId, signedIn }: { what: FollowType; targetId: string; signedIn: boolean }) {
  const [status, setStatus] = useState<"off" | "on" | "saving" | "denied" | "error">("off");

  useEffect(() => {
    if (!signedIn) return;
    let cancel = false;
    fetch(withBasePath("/api/follows"))
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { follows?: { targetType?: string; targetId?: string }[] };
        const on = Array.isArray(body.follows)
          ? body.follows.some((item) => item.targetType === what && item.targetId === targetId)
          : false;
        if (!cancel && on) setStatus("on");
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [what, targetId, signedIn]);

  async function onClick() {
    if (!signedIn) {
      setStatus("denied");
      return;
    }
    const following = status === "on";
    setStatus("saving");
    try {
      const response = await fetch(withBasePath("/api/follows"), {
        method: following ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType: what, targetId }),
      });
      if (response.status === 401) {
        setStatus("denied");
        return;
      }
      if (!response.ok) {
        setStatus("error");
        return;
      }
      setStatus(following ? "off" : "on");
    } catch {
      setStatus("error");
    }
  }

  const name = LABEL[what];
  return (
    <div>
      <button className="btn btn-ghost" type="button" onClick={onClick} disabled={status === "saving"}>
        {status === "on" ? `Following ${name}` : `Follow ${name}`}
      </button>
      {status === "denied" ? (
        <p className="hint" role="status">
          Not saved. <Link href="/sign-in">Sign in</Link>
        </p>
      ) : null}
      {status === "error" ? (
        <p className="hint" role="alert">
          Could not save this follow.
        </p>
      ) : null}
    </div>
  );
}
