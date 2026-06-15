"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useDebateRealtime } from "@/lib/hooks/useDebateRealtime";
import { Badge } from "@/components/ui/badge";
import type { DebateMessage } from "@/lib/types";

interface DebateMessagesLiveProps {
  debateRoomId: string;
  initialMessages: DebateMessage[];
}

export function DebateMessagesLive({
  debateRoomId,
  initialMessages,
}: DebateMessagesLiveProps) {
  const { messages: liveMessages, connected } = useDebateRealtime(debateRoomId);
  const initialIds = new Set(initialMessages.map((m) => m.id));
  const newLive = liveMessages.filter((m) => !initialIds.has(m.id));
  const messages = [...initialMessages, ...newLive];

  return (
    <div className="space-y-3">
      {connected && (
        <Badge variant="live" className="mb-1">Live updates</Badge>
      )}
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: i < initialMessages.length ? i * 0.05 : 0 }}
            className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-2.5 hover:border-white/12 transition-colors duration-200"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{msg.agentName}</span>
              <Badge variant={msg.side === "yes" ? "yes" : msg.side === "no" ? "no" : "secondary"}>
                {msg.side.toUpperCase()}
              </Badge>
              <Badge variant="secondary">{msg.messageType}</Badge>
              <span className="text-xs text-white/35 ml-auto tabular-nums">
                {msg.confidenceScore}% confidence
              </span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">{msg.content}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
