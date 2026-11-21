"use client";

import Link from "next/link";
import { useState } from "react";
import type { Follow } from "@/lib/users/follows";

const FOLLOW_LABEL = {
  race: "Race",
  candidate: "Person",
  jurisdiction: "Place",
  measure: "Ballot question",
  issue: "Topic",
} as const;

export function AccountPanel({
  email,
  follows,
  loadError,
}: {
  email: string;
  follows: Follow[];
  loadError: boolean;
}) {
  const [saved, setSaved] = useState<Follow[]>(follows);
  const [message, setMessage] = useState<string | null>(loadError ? "Saved races unavailable." : null);
  async function unfollow(follow: Follow) {
    const response = await fetch("/api/follows", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: follow.targetType, targetId: follow.targetId }),
    });
    if (!response.ok) {
      setMessage("Could not remove that follow.");
      return;
    }
    setSaved((current) =>
      current.filter((item) => item.targetType !== follow.targetType || item.targetId !== follow.targetId),
    );
  }

  return (
    <div>
      <p>{email}</p>
      <h2>Saved</h2>
      {saved.length === 0 ? (
        <p>
          <Link href="/">Find races to follow</Link>
        </p>
      ) : (
        <ul className="plain-list">
          {saved.map((follow) => {
            const href = followHref(follow);
            return (
              <li key={`${follow.targetType}:${follow.targetId}`}>
                {FOLLOW_LABEL[follow.targetType]}
                {href ? (
                  <>
                    {" · "}
                    <Link href={href}>Open</Link>
                  </>
                ) : null}{" "}
                <button className="btn btn-ghost" type="button" onClick={() => unfollow(follow)}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {message ? <p role="status" className="notice">{message}</p> : null}
    </div>
  );
}

function followHref(follow: Follow): string | null {
  if (follow.targetType === "race") return `/races/${follow.targetId}`;
  if (follow.targetType === "candidate") return `/candidates/${follow.targetId}`;
  if (follow.targetType === "jurisdiction" && follow.targetId.toUpperCase() === "KY") return "/";
  return null;
}
