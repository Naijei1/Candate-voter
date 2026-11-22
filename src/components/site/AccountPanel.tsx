"use client";

import { withBasePath } from "@/lib/base-path";
import Link from "next/link";
import { useState } from "react";
import type { Follow } from "@/lib/users/follows";

export function AccountPanel({
  email,
  follows,
  loadError,
  emailEnabled,
}: {
  email: string;
  follows: Array<Follow & { label: string }>;
  emailEnabled: boolean | null;
  loadError: boolean;
}) {
  const [saved, setSaved] = useState(follows);
  const [message, setMessage] = useState<string | null>(loadError ? "Watchlist unavailable." : null);
  const [alerts, setAlerts] = useState(emailEnabled);
  const [busy, setBusy] = useState(false);

  async function toggleAlerts() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(withBasePath("/api/alerts/email"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !alerts }),
      });
      if (!response.ok) throw new Error("Alert update unavailable");
      setAlerts(!alerts);
      if (!alerts) setMessage("Check your email to confirm alerts.");
    } catch {
      setMessage("Could not update email alerts.");
    } finally {
      setBusy(false);
    }
  }

  async function unfollow(follow: Follow) {
    const response = await fetch(withBasePath("/api/v1/me/follows"), {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: follow.targetType, targetId: follow.targetId }),
    }).catch(() => null);
    if (!response?.ok) {
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
      {alerts !== null ? (
        <button className={`btn ${alerts ? "btn-navy" : "btn-ghost"}`} type="button" aria-pressed={alerts} aria-disabled={busy} onClick={toggleAlerts}>
          Email me about what I follow
        </button>
      ) : null}
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
                {href ? <Link className="btn btn-ghost" href={href}>{follow.label}</Link> : follow.label}{" "}
                <button className="btn btn-ghost" type="button" aria-label={`Remove ${follow.label}`} onClick={() => unfollow(follow)}>
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
