"use client";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <section className="wrap">
      <p className="notice notice-error" role="alert">This page couldn&apos;t load.</p>
      <button className="btn btn-navy" type="button" onClick={reset}>Try again</button>
    </section>
  );
}
