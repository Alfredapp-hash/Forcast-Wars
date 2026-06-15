import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface PoweredByBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function PoweredByBadge({ className, size = "sm" }: PoweredByBadgeProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-1.5 text-white/40 hover:text-cyan-400/80 transition-colors",
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
    >
      <Zap className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      <span>Powered by Arkhe AgentOS</span>
    </Link>
  );
}
