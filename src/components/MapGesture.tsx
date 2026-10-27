"use client";

import React, { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { PAN_START, clampPan, midpoint, nextPan, pointDistance, type Pan, type Point } from "@/lib/map/gesture";

const TAP_SLOP = 8;

/**
 * Finger drag moves the map. A short tap still clicks through.
 * One finger pans. Two fingers pinch. The map stays inside the frame.
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
  const originRef = useRef<{ pan: Pan; mid: Point; distance: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [pan, setPan] = useState<Pan>(PAN_START);

  useEffect(() => {
    panRef.current = PAN_START;
    setPan(PAN_START);
  }, [resetKey]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const origin = originRef.current;
      if (!origin || !pointsRef.current.has(event.pointerId)) return;
      pointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = [...pointsRef.current.values()];
      if (pointDistance(midpoint(points), origin.mid) > TAP_SLOP) origin.moved = true;
      if (!origin.moved) return;
      const frame = frameRef.current?.getBoundingClientRect();
      const next = clampPan(
        nextPan(origin.pan, origin.mid, origin.distance, points),
        frame?.width ?? 0,
        frame?.height ?? 0,
      );
      panRef.current = next;
      setPan(next);
    };
    const onUp = (event: PointerEvent) => {
      const origin = originRef.current;
      if (!origin || !pointsRef.current.has(event.pointerId)) return;
      pointsRef.current.delete(event.pointerId);
      if (origin.moved) {
        suppressClick.current = true;
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 50);
      }
      if (pointsRef.current.size === 0) {
        originRef.current = null;
        return;
      }
      const points = [...pointsRef.current.values()];
      originRef.current = {
        pan: panRef.current,
        mid: midpoint(points),
        distance: points.length >= 2 ? pointDistance(points[0]!, points[1]!) : 0,
        moved: origin.moved,
      };
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
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
