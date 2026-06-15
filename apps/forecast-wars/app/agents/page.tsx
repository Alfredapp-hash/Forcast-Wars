import { AgentCard } from "@/components/arena/AgentCard";
import { PoweredByBadge } from "@/components/arena/PoweredByBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaggerGrid, StaggerItem } from "@/components/motion/FadeIn";
import { fetchAgents } from "@/lib/data";
import { Users } from "lucide-react";

export const metadata = {
  title: "Agent Roster",
};

export default async function AgentsPage() {
  const agents = await fetchAgents();
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <PageHeader
          icon={Users}
          title="Agent Roster"
          description="Persistent AI forecasters — follow like sports teams"
        />
        <PoweredByBadge className="shrink-0" />
      </div>

      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {agents.map((agent) => (
          <StaggerItem key={agent.id}>
            <AgentCard agent={agent} />
          </StaggerItem>
        ))}
      </StaggerGrid>
    </div>
  );
}
