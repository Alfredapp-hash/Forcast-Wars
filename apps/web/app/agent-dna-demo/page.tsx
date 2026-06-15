"use client";

import { AgentDNAHelix } from "@/components/agent-dna/AgentDNAHelix";

export default function AgentDNADemoPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-8"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(6,182,212,0.04) 0%, transparent 60%), #020817",
      }}
    >
      <AgentDNAHelix mode="demo" />
    </main>
  );
}
