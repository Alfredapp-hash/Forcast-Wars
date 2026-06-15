import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25",
        secondary: "bg-white/[0.06] text-white/65 border border-white/8",
        live: "bg-red-500/12 text-red-300 border border-red-500/25",
        yes: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
        no: "bg-red-500/15 text-red-300 border border-red-500/25",
        violet: "bg-violet-500/15 text-violet-300 border border-violet-500/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {variant === "live" && (
        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-live-pulse" aria-hidden />
      )}
      {children}
    </div>
  );
}
