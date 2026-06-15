import { notFound } from "next/navigation";
import { AgentProfileHeader } from "@/components/arena/AgentCard";
import { FollowAgentButton } from "@/components/arena/FollowAgentButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAgentBySlug } from "@/lib/data";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  const agent = await fetchAgentBySlug(params.slug);
  if (!agent) return { title: "Agent Not Found" };
  return { title: `${agent.name} — Forecast Wars` };
}

export default async function AgentProfilePage({ params }: Props) {
  const agent = await fetchAgentBySlug(params.slug);
  if (!agent) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <AgentProfileHeader agent={agent} />

      <FollowAgentButton agentId={agent.id} agentName={agent.name} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agent Lineage</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-white/60 space-y-2">
            <p>Cortex: Forecast</p>
            <p>Role: {agent.role}</p>
            <p>Model tier: {agent.modelTier}</p>
            <p>Memory entries: {agent.memoryCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debate Record</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-white/60 space-y-2">
            <p>Wins: {agent.debateWins}</p>
            <p>Losses: {agent.debateLosses}</p>
            <p>Win rate: {((agent.debateWins / (agent.debateWins + agent.debateLosses)) * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
