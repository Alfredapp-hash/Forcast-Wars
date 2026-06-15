"use client";

import { motion } from "framer-motion";
import { cn, formatPercent } from "@/lib/utils";

interface CrowdSentimentBarProps {
  yesPercent: number;
  noPercent: number;
  className?: string;
}

export function CrowdSentimentBar({
  yesPercent,
  noPercent,
  className,
}: CrowdSentimentBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-xs font-medium">
        <span className="text-emerald-400">YES {formatPercent(yesPercent)}</span>
        <span className="text-white/50">Crowd</span>
        <span className="text-red-400">NO {formatPercent(noPercent)}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden">
        <motion.div
          className="bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${yesPercent}%` }}
          transition={{ duration: 0.6 }}
        />
        <motion.div
          className="bg-red-500"
          initial={{ width: 0 }}
          animate={{ width: `${noPercent}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}
