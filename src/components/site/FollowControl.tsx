"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusMark } from "@/components/site/StatusMark";

export function FollowControl({
  what,
}: {
  what: "race" | "candidate";
}) {
  const [open, setOpen] = useState(false);
  const label = what === "race" ? "Follow race" : "Follow candidate";
  return (
    <div>
      <button className="btn btn-navy" type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <p className="notice" role="status">
          <StatusMark kind="preview" />
          Following needs an account, and accounts are not turned on. This choice is not saved on
          the server. Refreshing clears it. No email or notification will be sent.{" "}
          <Link href="/sign-in">Open the sign-in preview</Link>
        </p>
      ) : null}
    </div>
  );
}
