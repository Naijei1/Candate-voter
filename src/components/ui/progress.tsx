import { cn } from "@/lib/utils";

export function Progress({ value, className, label = "Progress" }: { value: number; className?: string; label?: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded bg-slate-200", className)} role="progressbar" aria-label={label} aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded bg-navy" style={{ width: `${width}%` }} />
    </div>
  );
}
