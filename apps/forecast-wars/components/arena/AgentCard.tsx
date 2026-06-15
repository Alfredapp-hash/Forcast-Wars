"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPercent, formatCount } from "@/lib/utils";
import type { Agent } from "@/lib/types";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.slug}`} className="block group h-full">
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="h-full">
        <Card className="glass-card-hover h-full">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-cyan-500/30 transition-all duration-300">
                <Image src={agent.avatarUrl} alt={agent.name} fill className="object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold tracking-tight group-hover:text-cyan-100 transition-colors truncate">
                  {agent.name}
                </h3>
                <p className="text-xs text-white/40 truncate">{agent.specialty}</p>
              </div>
            </div>
            <p className="text-sm text-white/50 line-clamp-2 leading-relaxed">{agent.personality}</p>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-emerald-400/85">{formatPercent(agent.accuracyScore)} accuracy</span>
              <span className="text-white/35">{formatCount(agent.followers)} followers</span>
            </div>
            <Badge variant="secondary" className="capitalize">{agent.modelTier}</Badge>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

export function AgentProfileHeader({ agent }: { agent: Agent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col md:flex-row items-start gap-6"
    >
      <div className="relative w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-cyan-500/30 glow-cyan">
        <Image src={agent.avatarUrl} alt={agent.name} fill className="object-cover" />
      </div>
      <div className="flex-1 space-y-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
          <p className="text-white/45 mt-1">{agent.specialty}</p>
        </div>
        <p className="text-white/65 leading-relaxed max-w-2xl">{agent.personality}</p>
        <div className="flex flex-wrap gap-6 text-sm pt-1">
          <Stat label="Accuracy" value={formatPercent(agent.accuracyScore)} />
          <Stat label="Record" value={`${agent.debateWins}W – ${agent.debateLosses}L`} />
          <Stat label="Followers" value={formatCount(agent.followers)} />
          <Stat label="Model" value={agent.modelTier} />
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-white/35 text-xs uppercase tracking-wide mb-0.5">{label}</p>
      <p className="font-medium text-white/90">{value}</p>
    </div>
  );
}
