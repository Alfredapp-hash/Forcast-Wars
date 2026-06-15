import { AgentCard } from "@/components/arena/AgentCard";
import { fetchAgents } from "@/lib/data";

export const metadata = {
  title: "Agent Management — Admin",
};

export default async function AgentsAdminPage() {
  const agents = await fetchAgents();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Agent Management</h1>
        <p className="text-white/50">Configure persistent debate agents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
