import { US_STATE_SHAPES } from "@/lib/geo/us-states";

/** Crop the shared state outline to its own bounds. */
function viewBoxFor(d: string): string {
  const nums = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let index = 0; index + 1 < nums.length; index += 2) {
    const x = nums[index] ?? 0;
    const y = nums[index + 1] ?? 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return "0 0 120 64";
  const padX = (maxX - minX) * 0.06;
  const padY = (maxY - minY) * 0.12;
  return `${minX - padX} ${minY - padY} ${maxX - minX + padX * 2} ${maxY - minY + padY * 2}`;
}

export function StateSilhouette({ code }: { code: string }) {
  const shape = US_STATE_SHAPES.find((item) => item.postal === code);
  if (!shape) return null;
  return (
    <svg className="state-mark" viewBox={viewBoxFor(shape.d)} aria-hidden="true">
      <path d={shape.d} fill="currentColor" />
    </svg>
  );
}
