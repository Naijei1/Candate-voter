"use client";

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { sheetLevel, sheetSnap, type SheetSnaps } from "@/lib/map/gesture";

type Drag = {
  pointerId: number;
  startY: number;
  startHeight: number;
  fromChrome: boolean;
  shell: HTMLElement;
  sheet: HTMLElement;
  body: HTMLElement | null;
  snaps: SheetSnaps;
  moved: boolean;
};

/**
 * Phone state sheet. Drag the handle, or pull down while the list is at the
 * top, to peek, resize, or dismiss. Desktop layout is left alone.
 */
export function useMobileSheet(dismiss: (() => void) | null, resetKey: string) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  const restRef = useRef<number | null>(null);
  const pointerDroveRef = useRef(false);
  const driveRef = useRef<(clientY: number) => void>(() => {});
  const endRef = useRef<(pointerId: number) => void>(() => {});

  useEffect(() => {
    const shell = sheetRef.current?.closest(".state-shell");
    if (shell instanceof HTMLElement) {
      shell.style.removeProperty("--sheet-height");
      shell.classList.remove("is-sheet-dragging");
    }
    restRef.current = null;
  }, [resetKey]);

  useEffect(() => {
    const sheet = sheetRef.current;
    const blockTouch = (event: TouchEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.fromChrome || drag.moved) event.preventDefault();
      // iOS can deliver touchmove without pointermove. Drive from the finger
      // until a pointermove proves the pointer stream is alive.
      if (pointerDroveRef.current) return;
      const touch = event.touches[0];
      if (!touch) return;
      driveRef.current(touch.clientY);
    };
    const endTouch = (event: TouchEvent) => {
      const drag = dragRef.current;
      if (!drag || event.touches.length > 0) return;
      endRef.current(drag.pointerId);
    };
    sheet?.addEventListener("touchmove", blockTouch, { passive: false });
    sheet?.addEventListener("touchend", endTouch);
    sheet?.addEventListener("touchcancel", endTouch);
    return () => {
      sheet?.removeEventListener("touchmove", blockTouch);
      sheet?.removeEventListener("touchend", endTouch);
      sheet?.removeEventListener("touchcancel", endTouch);
    };
  }, [resetKey]);

  useEffect(() => {
    const applyDrag = (clientY: number) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dy = clientY - drag.startY;
      if (!drag.fromChrome) {
        const scrollTop = drag.body?.scrollTop ?? 0;
        if (dy > 0 && scrollTop > 2) return;
        if (dy < 0 && drag.startHeight >= drag.snaps.full - 1) return;
      }
      if (Math.abs(dy) < 4 && !drag.moved) return;
      drag.moved = true;
      drag.shell.classList.add("is-sheet-dragging");
      const next = Math.min(drag.snaps.full, Math.max(drag.snaps.peek * 0.45, drag.startHeight - dy));
      drag.shell.style.setProperty("--sheet-height", `${Math.round(next)}px`);
    };
    driveRef.current = applyDrag;
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      pointerDroveRef.current = true;
      applyDrag(event.clientY);
    };
    const end = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      pointerDroveRef.current = false;
      drag.shell.classList.remove("is-sheet-dragging");
      if (!drag.moved) return;
      const height = drag.sheet.getBoundingClientRect().height;
      const snapped = sheetSnap(height, drag.snaps, dismissRef.current != null);
      if (snapped.dismiss) {
        drag.shell.style.removeProperty("--sheet-height");
        dismissRef.current?.();
        return;
      }
      drag.shell.style.setProperty("--sheet-height", `${Math.round(snapped.height)}px`);
      const grab = drag.sheet.querySelector(".sheet-grab");
      if (grab instanceof HTMLElement) {
        grab.setAttribute("aria-valuenow", String(sheetLevel(snapped.height, drag.snaps)));
      }
    };
    endRef.current = (pointerId: number) => {
      end({ pointerId } as PointerEvent);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  function snapsFor(sheet: HTMLElement): SheetSnaps {
    const chrome = sheet.querySelector(".back-chrome")?.getBoundingClientRect().height ?? 108;
    const peek = Math.max(104, Math.ceil(chrome));
    const viewport = window.innerHeight;
    if (restRef.current == null) restRef.current = sheet.getBoundingClientRect().height;
    const half = Math.max(peek + 72, restRef.current);
    const full = Math.max(half + 48, Math.min(viewport * 0.8, viewport - 96));
    return { peek, half, full };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const grab = target.closest(".sheet-grab, .back-chrome");
    const interactive = target.closest("a, button, input, textarea, select, summary");
    if (interactive && !target.closest(".sheet-grab")) return;
    const sheet = sheetRef.current;
    const shell = sheet?.closest(".state-shell");
    if (!(sheet instanceof HTMLElement) || !(shell instanceof HTMLElement)) return;
    const body = sheet.querySelector(".state-sheet-body");
    const fromChrome = Boolean(grab);
    pointerDroveRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: sheet.getBoundingClientRect().height,
      fromChrome,
      shell,
      sheet,
      body: body instanceof HTMLElement ? body : null,
      snaps: snapsFor(sheet),
      moved: false,
    };
    if (!fromChrome) return;
    const host = event.currentTarget;
    try {
      host.setPointerCapture(event.pointerId);
    } catch {
      // A touch can end before capture is attached.
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    pointerDroveRef.current = true;
    driveRef.current(event.clientY);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    endRef.current(event.pointerId);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Escape") return;
    const sheet = sheetRef.current;
    const shell = sheet?.closest(".state-shell");
    if (!(sheet instanceof HTMLElement) || !(shell instanceof HTMLElement)) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    event.preventDefault();
    const snaps = snapsFor(sheet);
    const height = sheet.getBoundingClientRect().height;
    const level = sheetLevel(height, snaps);
    if (event.key === "Escape" || (event.key === "ArrowDown" && level === 0)) {
      if (dismissRef.current) {
        shell.style.removeProperty("--sheet-height");
        dismissRef.current();
      } else {
        shell.style.setProperty("--sheet-height", `${snaps.peek}px`);
      }
      return;
    }
    const next = event.key === "ArrowUp" ? Math.min(2, level + 1) : Math.max(0, level - 1);
    const heightNext = next === 2 ? snaps.full : next === 0 ? snaps.peek : snaps.half;
    shell.style.setProperty("--sheet-height", `${Math.round(heightNext)}px`);
    event.currentTarget.setAttribute("aria-valuenow", String(next));
  }

  return { sheetRef, onPointerDown, onPointerMove, onPointerUp, onKeyDown };
}
