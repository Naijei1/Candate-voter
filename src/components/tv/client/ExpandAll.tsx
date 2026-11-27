"use client";

/** "Open all" and "Close all" for the topic sections inside `scope`. */
export function ExpandAll({ scope }: { scope: string }) {
  const set = (open: boolean) => {
    document.querySelectorAll<HTMLDetailsElement>(`${scope} .cblk > details`).forEach((section) => {
      section.open = open;
    });
  };
  return (
    <div className="cexp">
      <button className="btn outline sm" type="button" aria-label="Open all topics" onClick={() => set(true)}>
        Open all
      </button>
      <button className="btn outline sm" type="button" aria-label="Close all topics" onClick={() => set(false)}>
        Close all
      </button>
    </div>
  );
}
