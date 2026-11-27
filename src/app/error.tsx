"use client";

import { Icon } from "@/components/tv/Icon";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <div className="wrap">
      <h1 className="t-h1 pt">This page didn’t load</h1>
      <div className="alert" role="alert">
        <Icon name="warn" />
        <div>
          <b>A source did not respond.</b>
          <p>Try again in a moment.</p>
          <button className="btn outline sm" type="button" onClick={reset}>
            <Icon name="retry" size="sm" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
