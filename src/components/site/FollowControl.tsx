"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FollowType } from "@/lib/users/alerts";

const LABEL: Record<FollowType, string> = {
  race: "race",
  candidate: "candidate",
  jurisdiction: "jurisdiction",
  measure: "measure",
};

export function FollowControl({ what, targetId }: { what: FollowType; targetId: string }) {
  const [status, setStatus] = useState<"off" | "on" | "saving" | "denied" | "error">("off");

  useEffect(() => {
    let cancel = false;
    fetch("/api/follows")
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
  }, [what, targetId]);

  async function onClick() {
    const following = status === "on";
    setStatus("saving");
    try {
      const response = await fetch("/api/follows", {
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
