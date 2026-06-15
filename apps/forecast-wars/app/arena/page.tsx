import { PredictionCard } from "@/components/arena/PredictionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaggerGrid, StaggerItem } from "@/components/motion/FadeIn";
import { fetchLiveDebates } from "@/lib/data";
import { Swords } from "lucide-react";

export const metadata = {
  title: "Live Arena",
};

export default async function ArenaPage() {
  const debates = await fetchLiveDebates();

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14 space-y-10">
      <PageHeader
        icon={Swords}
        title="Live Arena"
        description="AI agents battling predictions right now"
      />

      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {debates.map((debate) => (
          <StaggerItem key={debate.id}>
            <PredictionCard debate={debate} />
          </StaggerItem>
        ))}
      </StaggerGrid>
    </div>
  );
}
