"use client";

import React, { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { PAN_START, clampPan, midpoint, nextPan, pointDistance, type Pan, type Point } from "@/lib/map/gesture";

const TAP_SLOP = 8;

type Origin = { pan: Pan; mid: Point; distance: number; moved: boolean };

/**
 * Finger or mouse drag moves the map. A short tap still clicks through.
 * One finger pans. Two fingers pinch around the midpoint between them.
 * Pointer events cover the mouse. Touch listeners cover iOS Safari, which
 * can drop pointermove unless the gesture surface owns the touch.
 */
export function MapGesture({
  children,
  resetKey = "",
  className = "",
}: {
  children: ReactNode;
  resetKey?: string;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<Pan>(PAN_START);
  const pointsRef = useRef(new Map<number, Point>());
  const originRef = useRef<Origin | null>(null);
  const modeRef = useRef<"pointer" | "touch" | null>(null);
  const pointerDroveRef = useRef(false);
  const suppressClick = useRef(false);
  const [pan, setPan] = useState<Pan>(PAN_START);

  useEffect(() => {
    panRef.current = PAN_START;
    setPan(PAN_START);
    pointsRef.current.clear();
    originRef.current = null;
    modeRef.current = null;
    pointerDroveRef.current = false;
  }, [resetKey]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const box = () => frame.getBoundingClientRect();
    const center = (): Point | null => {
      const frameBox = box();
      if (frameBox.width <= 0 || frameBox.height <= 0) return null;
      return { x: frameBox.left + frameBox.width / 2, y: frameBox.top + frameBox.height / 2 };
    };
    const remember = (points: readonly Point[], moved = originRef.current?.moved ?? false) => {
      originRef.current = {
        pan: panRef.current,
        mid: midpoint(points),
        distance: points.length >= 2 ? pointDistance(points[0]!, points[1]!) : 0,
        moved,
      };
    };
    const apply = (points: readonly Point[]) => {
      const origin = originRef.current;
      if (!origin || points.length === 0) return;
      if (pointDistance(midpoint(points), origin.mid) > TAP_SLOP) origin.moved = true;
      if (!origin.moved) return;
      const frameBox = box();
      const next = clampPan(
        nextPan(origin.pan, origin.mid, origin.distance, points, center()),
        frameBox.width,
        frameBox.height,
      );
      panRef.current = next;
      setPan(next);
    };
    const finish = (moved: boolean) => {
      if (!moved) return;
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 50);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (modeRef.current !== "pointer" || !pointsRef.current.has(event.pointerId)) return;
      pointerDroveRef.current = true;
      pointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      apply([...pointsRef.current.values()]);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (modeRef.current !== "pointer" || !pointsRef.current.has(event.pointerId)) return;
      pointsRef.current.delete(event.pointerId);
      const moved = originRef.current?.moved ?? false;
      if (pointsRef.current.size === 0) {
        finish(moved);
        originRef.current = null;
        modeRef.current = null;
        pointerDroveRef.current = false;
        return;
      }
      remember([...pointsRef.current.values()], moved);
    };

    const touchesOf = (event: TouchEvent): Point[] =>
      [...event.touches].map((touch) => ({ x: touch.clientX, y: touch.clientY }));
    const onTouchStart = (event: TouchEvent) => {
      if (modeRef.current === "pointer") return;
      const points = touchesOf(event);
      if (points.length === 0) return;
      modeRef.current = "touch";
      remember(points);
    };
    const onTouchMove = (event: TouchEvent) => {
      if (modeRef.current == null) return;
      // iOS Safari pans the page instead of the map unless this is cancelled.
      event.preventDefault();
      const driveFromTouch = modeRef.current === "touch" || !pointerDroveRef.current;
      if (!driveFromTouch) return;
      const points = touchesOf(event);
      if (points.length === 0) return;
      if (originRef.current && points.length >= 2 && originRef.current.distance === 0) {
        remember(points, originRef.current.moved);
      }
      apply(points);
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (modeRef.current !== "touch") return;
      const points = touchesOf(event);
      const moved = originRef.current?.moved ?? false;
      if (points.length === 0) {
        finish(moved);
        originRef.current = null;
        modeRef.current = null;
        return;
      }
      remember(points, moved);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    frame.addEventListener("touchstart", onTouchStart, { passive: true });
    frame.addEventListener("touchmove", onTouchMove, { passive: false });
    frame.addEventListener("touchend", onTouchEnd);
    frame.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      frame.removeEventListener("touchstart", onTouchStart);
      frame.removeEventListener("touchmove", onTouchMove);
      frame.removeEventListener("touchend", onTouchEnd);
      frame.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (modeRef.current === "touch") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    modeRef.current = "pointer";
    pointerDroveRef.current = false;
    pointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointsRef.current.values()];
    originRef.current = {
      pan: panRef.current,
      mid: midpoint(points),
      distance: points.length >= 2 ? pointDistance(points[0]!, points[1]!) : 0,
      moved: originRef.current?.moved ?? false,
    };
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  const transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${pan.scale})`;
  return (
    <div
      ref={frameRef}
      className={className ? `map-gesture ${className}` : "map-gesture"}
      data-testid="map-gesture"
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
    >
      <div className="map-gesture-stage" style={{ transform }}>
        {children}
      </div>
    </div>
  );
}
