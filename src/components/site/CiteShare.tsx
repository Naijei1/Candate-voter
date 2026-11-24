"use client";

import { useState } from "react";
import { withBasePath } from "@/lib/base-path";
import styles from "./reading.module.css";

export function CiteShare({ title, path, updated }: { title: string; path: string; updated?: string | null }) {
  const [status, setStatus] = useState("");
  const citation = [title, absolute(path), updated ? `Updated ${updated}` : ""].filter(Boolean).join(". ") + ".";

  async function copy() {
    try {
      await navigator.clipboard.writeText(citation);
      setStatus("Citation copied.");
    } catch {
      setStatus("Couldn’t copy the citation.");
    }
  }

  async function share() {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title, url: absolute(path), text: citation });
    } catch {
      /* The visitor closed the share sheet. */
    }
  }

  return (
    <div className={styles.share}>
      <button type="button" className="btn btn-ghost" onClick={() => void copy()}>Copy citation</button>
      <button type="button" className="btn btn-ghost" onClick={() => void share()}>Share</button>
      <p role="status" className="hint">{status}</p>
    </div>
  );
}

function absolute(path: string): string {
  const prefixed = withBasePath(path);
  if (typeof window === "undefined") return prefixed;
  return new URL(prefixed, window.location.origin).href;
}
