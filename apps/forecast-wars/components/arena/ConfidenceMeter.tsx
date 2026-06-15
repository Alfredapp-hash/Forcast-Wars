"use client";

import { motion } from "framer-motion";
import { cn, formatPercent } from "@/lib/utils";

interface ConfidenceMeterProps {
  value: number;
  label?: string;
  side?: "yes" | "no" | "neutral";
  className?: string;
}

export function ConfidenceMeter({
  value,
  label = "Confidence",
  side = "neutral",
  className,
}: ConfidenceMeterProps) {
  const color =
    side === "yes"
      ? "bg-emerald-500"
      : side === "no"
        ? "bg-red-500"
        : "bg-cyan-500";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono font-semibold text-white"
        >
          {formatPercent(value)}
        </motion.span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
