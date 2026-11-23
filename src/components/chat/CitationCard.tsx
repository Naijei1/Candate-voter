"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useEffect, useState } from "react";
import { basePathFromEnv } from "@/lib/base-path";
import { dayLabel, instantDateTime } from "@/lib/format";
import { SourcePeek } from "@/components/site/SourcePeek";
import { citationLabel, citationLink, formatAsOf } from "@/lib/chat/ui";
import type { ChatSource } from "@/lib/chat/types";

export function CitationCard({ source }: { source: ChatSource }) {
  const origin = useClientOrigin();
  const link = citationLink(source.url, { origin, basePath: basePathFromEnv() });
  const sourceDay = /^\d{4}-\d{2}-\d{2}$/.test(source.as_of) ? source.as_of : null;
  const dateTime = sourceDay ?? instantDateTime(source.as_of);
  const freshness = sourceDay ? dayLabel(sourceDay) : formatAsOf(source.as_of);
  const label = citationLabel(source);

  return (
    <li className="rounded-lg border border-line bg-card px-3 py-2 text-sm">
      {link ? (
        <SourcePeek name={label} url={link.href} date={sourceDay} />
      ) : (
        <p className="font-semibold text-ink">{label}</p>
      )}
      {source.as_of !== "unknown" ? (
        <p className="mt-1 text-xs text-muted">
          {dateTime ? <time dateTime={dateTime}>{freshness}</time> : freshness}
        </p>
      ) : null}
    </li>
  );
}

function useClientOrigin(): string | undefined {
  const [origin, setOrigin] = useState<string | undefined>(undefined);
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  return origin;
}
