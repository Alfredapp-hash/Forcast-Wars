"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface FollowAgentButtonProps {
  agentId: string;
  agentName: string;
}

export function FollowAgentButton({ agentId, agentName }: FollowAgentButtonProps) {
  const [status, setStatus] = useState<string | null>(null);

  const follow = async () => {
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followType: "agent", followId: agentId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(res.status === 401 ? "Sign in to follow agents" : data.error);
      return;
    }
    trackEvent("follow_agent", { agentId, agentName });
    setStatus(`Following ${agentName}`);
  };

  return (
    <div className="space-y-2">
      <Button variant="violet" onClick={follow}>
        <UserPlus className="h-4 w-4" />
        Follow {agentName}
      </Button>
      {status && <p className="text-sm text-white/50">{status}</p>}
    </div>
  );
}
