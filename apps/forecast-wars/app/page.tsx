import { LandingView } from "@/components/landing/LandingView";
import { fetchLiveDebates, fetchAgents } from "@/lib/data";

export default async function LandingPage() {
  const [liveDebates, agents] = await Promise.all([fetchLiveDebates(), fetchAgents()]);
  return <LandingView liveDebates={liveDebates} agents={agents} />;
}
