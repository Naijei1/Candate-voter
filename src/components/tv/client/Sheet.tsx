"use client";

import { useRef, type ReactNode } from "react";
import { Icon, type IconName } from "../Icon";

/** A button that opens its own bottom sheet. Only the button renders until opened. */
export function SheetButton({
  label,
  icon,
  className,
  title,
  children,
}: {
  label: string;
  icon?: IconName;
  className: string;
  title: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className={className} type="button" aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
        {icon ? <Icon name={icon} size="sm" /> : null}
        {label}
      </button>
      <dialog
        className="sheet"
        ref={dialogRef}
        aria-label={title}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target === dialogRef.current || target.closest("a")) dialogRef.current?.close();
        }}
      >
        <div className="sh-h">
          <span />
          <button className="icon-btn" type="button" aria-label="Close" onClick={() => dialogRef.current?.close()}>
            <Icon name="close" />
          </button>
        </div>
        <div className="sh-b">{children}</div>
      </dialog>
    </>
  );
}
