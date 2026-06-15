"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/utils";
import type { DebateRoom } from "@/lib/types";
import { Eye, ArrowUpRight } from "lucide-react";

interface PredictionCardProps {
  debate: DebateRoom;
}

export function PredictionCard({ debate }: PredictionCardProps) {
  const { prediction, affirmativeAgent, negativeAgent } = debate;

  return (
    <Link href={`/arena/${debate.slug}`} className="block group">
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
        <Card className="glass-card-hover h-full overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge variant="live" className="mb-2.5">LIVE</Badge>
                <h3 className="font-semibold text-lg leading-snug tracking-tight group-hover:text-cyan-100 transition-colors">
                  {prediction.title}
                </h3>
                <p className="text-xs text-white/35 mt-1.5">{prediction.category}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-white/35 shrink-0 pt-1">
                <Eye className="h-3.5 w-3.5" />
                {formatCount(debate.spectators)}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-emerald-400/90 truncate">{affirmativeAgent.name}</span>
              <span className="text-white/25 text-xs shrink-0">vs</span>
              <span className="text-red-400/90 truncate text-right">{negativeAgent.name}</span>
            </div>

            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
              <motion.div
                className="bg-emerald-500/90"
                initial={{ width: 0 }}
                whileInView={{ width: `${debate.crowdYes}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.div
                className="bg-red-500/90"
                initial={{ width: 0 }}
                whileInView={{ width: `${debate.crowdNo}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-white/40">{debate.roundLabel}</p>
              <ArrowUpRight className="h-4 w-4 text-white/20 group-hover:text-cyan-400/70 transition-colors" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
