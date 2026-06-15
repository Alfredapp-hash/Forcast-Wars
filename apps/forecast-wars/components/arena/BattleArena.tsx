"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { cn, formatPercent, formatCount } from "@/lib/utils";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { CrowdSentimentBar } from "./CrowdSentimentBar";
import { PoweredByBadge } from "./PoweredByBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Share2, UserPlus } from "lucide-react";
import type { DebateRoom } from "@/lib/types";
import { fadeUp, staggerContainer } from "@/lib/motion";

interface BattleArenaProps {
  debate: DebateRoom;
  className?: string;
}

export function BattleArena({ debate, className }: BattleArenaProps) {
  const { affirmativeAgent: aff, negativeAgent: neg, prediction } = debate;

  return (
    <div className={cn("relative", className)}>
      <div className="arena-ring absolute inset-0 rounded-3xl pointer-events-none opacity-80" />

      <motion.div
        className="relative flex flex-col items-center gap-8 p-6 md:p-10"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div variants={fadeUp} className="text-center space-y-3 max-w-2xl">
          <Badge variant="live">LIVE</Badge>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">
            {prediction.title}
          </h1>
          <p className="text-sm text-white/45">{debate.roundLabel}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl items-stretch">
          <motion.div variants={fadeUp}>
            <AgentFighter
              agent={aff}
              side="yes"
              position={prediction.yesPosition}
              confidence={78}
            />
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col items-center justify-center gap-5 py-4">
            <div className="w-16 h-16 rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.06] flex items-center justify-center">
              <span className="text-xl font-bold text-cyan-400/90 tracking-wider">VS</span>
            </div>
            <CrowdSentimentBar
              yesPercent={debate.crowdYes}
              noPercent={debate.crowdNo}
              className="w-full max-w-xs"
            />
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <Eye className="h-3.5 w-3.5" />
              {formatCount(debate.spectators)} watching
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <AgentFighter
              agent={neg}
              side="no"
              position={prediction.noPosition}
              confidence={61}
            />
          </motion.div>
        </div>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-2 justify-center">
          <Button variant="yes" size="sm">Join YES</Button>
          <Button variant="no" size="sm">Join NO</Button>
          <Button variant="secondary" size="sm">
            <UserPlus className="h-4 w-4" />
            Follow Agents
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </motion.div>

        <motion.div variants={fadeUp}>
          <PoweredByBadge />
        </motion.div>
      </motion.div>
    </div>
  );
}

function AgentFighter({
  agent,
  side,
  position,
  confidence,
}: {
  agent: DebateRoom["affirmativeAgent"];
  side: "yes" | "no";
  position: string;
  confidence: number;
}) {
  const borderColor = side === "yes" ? "border-emerald-500/25" : "border-red-500/25";
  const accentBg = side === "yes" ? "from-emerald-500/[0.06]" : "from-red-500/[0.06]";

  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-5 space-y-4 h-full border bg-gradient-to-b to-transparent",
        borderColor,
        accentBg,
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("relative w-14 h-14 rounded-xl overflow-hidden ring-2", borderColor)}>
          <Image src={agent.avatarUrl} alt={agent.name} fill className="object-cover" />
        </div>
        <div className="min-w-0">
          <Link
            href={`/agents/${agent.slug}`}
            className="font-semibold text-lg hover:text-cyan-300 transition-colors truncate block"
          >
            {agent.name}
          </Link>
          <Badge variant={side === "yes" ? "yes" : "no"} className="mt-1.5">
            {side.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="text-xs text-white/45 space-y-1 leading-relaxed">
        <p>Accuracy: {formatPercent(agent.accuracyScore)}</p>
        <p className="line-clamp-2">{position}</p>
      </div>

      <ConfidenceMeter value={confidence} side={side} />
    </div>
  );
}
