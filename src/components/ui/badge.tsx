import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const TONE = {
  slate: "bg-slate-100 text-slate-800",
  dem: "bg-blue-100 text-blue-900",
  rep: "bg-red-100 text-red-900",
  other: "bg-amber-100 text-amber-950",
} as const;

export function Badge({
  tone = "slate",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof TONE }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium", TONE[tone], className)} {...props} />;
}
