import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn gap-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "btn-primary",
        ghost: "btn-ghost",
        quiet: "btn-quiet",
      },
      size: {
        default: "min-h-12",
        wide: "min-h-12 w-full",
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
