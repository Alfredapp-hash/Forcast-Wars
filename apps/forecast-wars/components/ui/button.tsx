import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-cyan-400 to-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 hover:from-cyan-300 hover:to-cyan-400 hover:shadow-cyan-500/30",
        secondary:
          "bg-white/[0.06] text-white border border-white/10 hover:bg-white/10 hover:border-white/15",
        outline:
          "border border-white/15 bg-transparent hover:bg-white/[0.06] hover:border-white/25",
        ghost: "hover:bg-white/[0.08] text-white/80 hover:text-white",
        yes: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/22 hover:border-emerald-500/45",
        no: "bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/22 hover:border-red-500/45",
        violet:
          "bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/22",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
