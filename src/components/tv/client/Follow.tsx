"use client";

import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { SAVED_EVENT, savedKeys, toast, toggleSaved } from "./device";

export function FollowButton({ id, name, label = "Follow", className = "btn pill-o follow" }: { id: string; name: string; label?: string; className?: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(savedKeys().includes(id));
    sync();
    window.addEventListener(SAVED_EVENT, sync);
    return () => window.removeEventListener(SAVED_EVENT, sync);
  }, [id]);

  return (
    <button
      className={className}
      type="button"
      aria-pressed={on}
      onClick={() => {
        const next = toggleSaved(id, name);
        setOn(next);
        toast(next ? "Following. Saved on this device." : "Unfollowed. Removed from this device.");
      }}
    >
      <Icon name={on ? "check" : "star"} size="sm" />
      <span>{on ? "Following" : label}</span>
    </button>
  );
}
