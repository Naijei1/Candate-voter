import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a8a] disabled:pointer-events-none disabled:opacity-50 min-h-11 px-5",
  {
    variants: {
      variant: {
        default: "bg-[#1e3a8a] text-white hover:bg-[#1e40af]",
        ghost: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
        quiet: "bg-transparent text-[#1e3a8a] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5",
        wide: "h-12 w-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  const { children, ...rest } = props;
  const showArrow = !asChild && variant !== "ghost" && variant !== "quiet";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...rest}>
      {children}
      {showArrow ? <ArrowRight className="size-5" aria-hidden /> : null}
    </Comp>
  );
}
