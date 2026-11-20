export type Point = [number, number];

export function ringArea(ring: Point[]): number {
  return ring.reduce((area, [x, y], i) => {
    const [nextX, nextY] = ring[(i + 1) % ring.length];
    return area + x * nextY - nextX * y;
  }, 0) / 2;
}

export function signedDistance([x, y]: Point, polygon: Point[][]): number {
  let inside = false;
  let distance = Infinity;
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[j];
      const [bx, by] = ring[i];
      if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
      const dx = bx - ax;
      const dy = by - ay;
      const length = dx * dx + dy * dy;
      const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0;
      distance = Math.min(distance, (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2);
    }
  }
  return (inside ? 1 : -1) * Math.sqrt(distance);
}

/** Search cells whose upper distance bound can still improve the best point. */
export function labelPoint(polygon: Point[][]): Point {
  const xs = polygon[0].map(([x]) => x);
  const ys = polygon[0].map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  let best = polygon[0][0];
  let clearance = 0;
  const tolerance = Math.min(0.5, Math.min(maxX - minX, maxY - minY) / 100);
  if (tolerance <= 0) return best;
  const cells = [{ x: (minX + maxX) / 2, y: (minY + maxY) / 2, half: Math.max(maxX - minX, maxY - minY) / 2 }];
  while (cells.length) {
    const { x, y, half } = cells.pop()!;
    const distance = signedDistance([x, y], polygon);
    if (distance > clearance) {
      best = [x, y];
      clearance = distance;
    }
    const upper = distance + half * Math.SQRT2;
    if (upper <= (clearance > 0 ? clearance + tolerance : 0) || half <= Number.EPSILON * Math.max(1, Math.abs(x), Math.abs(y))) continue;
    const step = half / 2;
    for (const dx of [-step, step]) {
      for (const dy of [-step, step]) cells.push({ x: x + dx, y: y + dy, half: step });
    }
  }
  return best;
}
