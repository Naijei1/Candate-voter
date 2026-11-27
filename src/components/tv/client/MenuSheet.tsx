"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../Icon";

export function MenuSheet({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  return (
    <>
      <button className="icon-btn only-m" type="button" aria-label="Menu" aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
        <Icon name="menu" />
      </button>
      <dialog
        className="sheet"
        ref={dialogRef}
        aria-labelledby="mn-h"
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target === dialogRef.current || target.closest("a")) dialogRef.current?.close();
        }}
      >
        <div className="sh-h">
          <h2 id="mn-h">Menu</h2>
          <button className="icon-btn" type="button" aria-label="Close" onClick={() => dialogRef.current?.close()}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
