"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle, Circle } from "lucide-react";

interface RoundTimelineProps {
  currentRound: number;
  roundLabel: string;
  className?: string;
}

const ROUNDS = [
  { num: 1, label: "Opening" },
  { num: 2, label: "Rebuttal" },
  { num: 3, label: "Closing" },
];

export function RoundTimeline({
  currentRound,
  roundLabel,
  className,
}: RoundTimelineProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-sm font-medium text-white/60">{roundLabel}</p>
      <div className="flex items-center gap-1">
        {ROUNDS.map((round, i) => {
          const isComplete = round.num < currentRound;
          const isCurrent = round.num === currentRound;
          return (
            <div key={round.num} className="flex items-center gap-1 flex-1 min-w-0">
              <motion.div
                className="flex items-center gap-2 flex-1 min-w-0"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
              >
                {isComplete ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400/90 shrink-0" />
                ) : (
                  <Circle
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isCurrent ? "text-cyan-400 fill-cyan-400/20" : "text-white/15",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "text-xs truncate",
                    isCurrent ? "text-cyan-300 font-medium" : isComplete ? "text-white/50" : "text-white/30",
                  )}
                >
                  {round.label}
                </span>
              </motion.div>
              {i < ROUNDS.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1 mx-1 transition-colors",
                    isComplete ? "bg-emerald-500/30" : "bg-white/[0.08]",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
