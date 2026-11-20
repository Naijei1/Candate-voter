import type { ReactNode } from "react";

export function ShortList({ className, items }: { className: string; items: ReactNode[] }) {
  return (
    <>
      <ul className={className}>{items.slice(0, 5)}</ul>
      {items.length > 5 ? (
        <details className="list-tail">
          <summary>Show all ({items.length})</summary>
          <ul className={className}>{items.slice(5)}</ul>
        </details>
      ) : null}
    </>
  );
}
