export type Point = { x: number; y: number };

export type Pan = { x: number; y: number; scale: number };

export const PAN_START: Pan = { x: 0, y: 0, scale: 1 };

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export function midpoint(points: readonly Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return { x: x / points.length, y: y / points.length };
}

export function pointDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Next pan after a one-finger drag or a two-finger pinch, before clamping.
 * When `frameCenter` is set, a pinch keeps the map point under the finger
 * midpoint (the gesture focal point) under the fingers. The stage scales
 * around its center, so the translation absorbs that focal shift.
 */
export function nextPan(
  start: Pan,
  startMid: Point,
  startDistance: number,
  points: readonly Point[],
  frameCenter?: Point | null,
): Pan {
  const mid = midpoint(points);
  let scale = start.scale;
  if (points.length >= 2 && startDistance > 0) {
    const [first, second] = points;
    if (first && second) {
      scale = start.scale * (pointDistance(first, second) / startDistance);
    }
  }
  if (frameCenter && scale !== start.scale && start.scale !== 0) {
    const ratio = scale / start.scale;
    return {
      scale,
      x: mid.x - frameCenter.x - (startMid.x - frameCenter.x - start.x) * ratio,
      y: mid.y - frameCenter.y - (startMid.y - frameCenter.y - start.y) * ratio,
    };
  }
  return {
    scale,
    x: start.x + mid.x - startMid.x,
    y: start.y + mid.y - startMid.y,
  };
}

export type PanLimits = {
  /** Lowest pinch scale. Defaults to 1 so a fitted map cannot shrink away. */
  minScale?: number;
  /** Unscaled drawing size. Larger than the frame when the map covers a tall stage. */
  contentWidth?: number;
  contentHeight?: number;
};

/** Keep the map on screen. At 1x a drag can still move it by about half the frame. */
export function clampPan(pan: Pan, width: number, height: number, limits?: PanLimits): Pan {
  const minScale = limits?.minScale ?? MIN_SCALE;
  const scale = Math.min(MAX_SCALE, Math.max(minScale, pan.scale));
  const contentWidth = limits?.contentWidth ?? width;
  const contentHeight = limits?.contentHeight ?? height;
  const overflowX = Math.max(0, contentWidth * scale - Math.max(0, width)) / 2;
  const overflowY = Math.max(0, contentHeight * scale - Math.max(0, height)) / 2;
  const span = 0.46 + Math.max(0, scale - 1) * 0.55;
  const limitX = Math.max(overflowX, Math.max(0, width) * span);
  const limitY = Math.max(overflowY, Math.max(0, height) * span);
  return {
    scale,
    x: Math.min(limitX, Math.max(-limitX, pan.x)),
    y: Math.min(limitY, Math.max(-limitY, pan.y)),
  };
}

export type SheetSnaps = {
  peek: number;
  half: number;
  full: number;
};

/** Snap a dragged sheet. Pulling well below the peek dismisses it. */
export function sheetSnap(
  height: number,
  snaps: SheetSnaps,
  canDismiss: boolean,
): { height: number; dismiss: boolean } {
  if (canDismiss && height < snaps.peek * 0.62) {
    return { height: snaps.peek, dismiss: true };
  }
  const points = [snaps.peek, snaps.half, snaps.full];
  const nearest = points.reduce((best, point) =>
    Math.abs(point - height) < Math.abs(best - height) ? point : best,
  );
  return { height: nearest, dismiss: false };
}

export function sheetLevel(height: number, snaps: SheetSnaps): 0 | 1 | 2 {
  const snapped = sheetSnap(height, snaps, false).height;
  if (snapped === snaps.full) return 2;
  if (snapped === snaps.peek) return 0;
  return 1;
}
