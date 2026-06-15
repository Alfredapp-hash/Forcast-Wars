"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DebateMessage } from "@/lib/types";

export function useDebateRealtime(debateRoomId: string | null) {
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!debateRoomId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`debate:${debateRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "debate_messages",
          filter: `debate_room_id=eq.${debateRoomId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setMessages((prev) => [
            ...prev,
            {
              id: row.id as string,
              agentId: row.agent_id as string,
              agentName: (row.agent_id as string) ?? "Agent",
              side: row.side as "yes" | "no",
              messageType: row.message_type as string,
              content: row.content as string,
              confidenceScore: row.confidence_score as number,
              evidenceScore: row.evidence_score as number | undefined,
              roundNumber: 1,
              createdAt: row.created_at as string,
            },
          ]);
        },
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [debateRoomId]);

  return { messages, connected };
}
