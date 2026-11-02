"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusMark } from "@/components/site/StatusMark";

export function FollowControl({ what }: { what: "race" | "candidate" }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="btn btn-ghost" type="button" onClick={() => setOpen(true)}>
        Follow {what}
      </button>
      {open ? (
        <p className="hint" role="status">
          <StatusMark kind="preview" />
          Not saved. <Link href="/sign-in">Sign in</Link>
        </p>
      ) : null}
    </div>
  );
}
