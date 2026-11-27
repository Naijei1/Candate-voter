"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

function place(pop: HTMLElement, button: HTMLElement) {
  const box = button.getBoundingClientRect();
  const width = pop.offsetWidth;
  const height = pop.offsetHeight;
  let left = box.left;
  if (left + width > window.innerWidth - 12) left = Math.max(12, box.right - width);
  let top = box.bottom + 8;
  if (top + height > window.innerHeight - 12 && box.top - height - 8 > 12) top = box.top - height - 8;
  pop.style.position = "fixed";
  pop.style.left = `${left}px`;
  pop.style.top = `${Math.max(8, top)}px`;
}

/** A button that opens a native popover: a menu of links, or a small panel. */
export function PopMenu({
  label,
  button,
  buttonClass,
  buttonLabel,
  kind = "menu",
  className = "menu",
  labelledBy,
  children,
}: {
  label: string;
  button: ReactNode;
  buttonClass: string;
  buttonLabel?: string;
  kind?: "menu" | "dialog";
  className?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  const popRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const pop = popRef.current;
    const trigger = buttonRef.current;
    if (!pop || !trigger) return;
    const onToggle = (event: Event) => {
      const open = (event as ToggleEvent).newState === "open";
      trigger.setAttribute("aria-expanded", String(open));
      if (!open && pop.contains(document.activeElement)) trigger.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (kind !== "menu") return;
      const items = [...pop.querySelectorAll<HTMLElement>("[role=menuitem]")];
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest("a")) pop.hidePopover?.();
    };
    pop.addEventListener("toggle", onToggle);
    pop.addEventListener("keydown", onKey);
    pop.addEventListener("click", onClick);
    return () => {
      pop.removeEventListener("toggle", onToggle);
      pop.removeEventListener("keydown", onKey);
      pop.removeEventListener("click", onClick);
    };
  }, [kind]);

  const open = () => {
    const pop = popRef.current;
    const trigger = buttonRef.current;
    if (!pop || !trigger || typeof pop.showPopover !== "function") return;
    if (pop.matches(":popover-open")) {
      pop.hidePopover();
      return;
    }
    pop.showPopover();
    place(pop, trigger);
    pop.querySelector<HTMLElement>("[role=menuitem], input, button, a")?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        className={buttonClass}
        type="button"
        aria-haspopup={kind}
        aria-expanded="false"
        aria-controls={id}
        aria-label={buttonLabel}
        onClick={open}
      >
        {button}
      </button>
      <div
        ref={popRef}
        className={className}
        id={id}
        popover="auto"
        role={kind}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </>
  );
}
