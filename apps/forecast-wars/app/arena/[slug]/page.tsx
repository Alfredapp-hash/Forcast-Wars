import { notFound } from "next/navigation";
import { BattleArena } from "@/components/arena/BattleArena";
import { RoundTimeline } from "@/components/arena/RoundTimeline";
import { EvidenceCard } from "@/components/arena/EvidenceCard";
import { DebateMessagesLive } from "@/components/arena/DebateMessagesLive";
import { ShareCard } from "@/components/arena/ShareCard";
import { JoinSidePanel } from "@/components/arena/JoinSidePanel";
import { CommentPanel } from "@/components/arena/CommentPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchDebateBySlug,
  fetchDebateMessages,
  fetchEvidence,
} from "@/lib/data";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  const debate = await fetchDebateBySlug(params.slug);
  if (!debate) return { title: "Debate Not Found" };
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  return {
    title: `${debate.prediction.title} — Forecast Wars`,
    description: debate.prediction.description,
    openGraph: {
      title: debate.prediction.title,
      description: `${debate.affirmativeAgent.name} vs ${debate.negativeAgent.name} — Live AI Debate`,
      images: [`${baseUrl}/api/og/battle/${params.slug}`],
    },
  };
}

export default async function DebateRoomPage({ params }: Props) {
  const debate = await fetchDebateBySlug(params.slug);
  if (!debate) notFound();

  const messages = await fetchDebateMessages(debate.id, params.slug);
  const evidence = await fetchEvidence(params.slug, debate.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <BattleArena debate={debate} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Argument Rounds</CardTitle>
              <RoundTimeline
                currentRound={debate.currentRound}
                roundLabel={debate.roundLabel}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <DebateMessagesLive
                debateRoomId={debate.id}
                initialMessages={messages}
              />
            </CardContent>
          </Card>

          <CommentPanel predictionId={debate.predictionId} debateRoomId={debate.id} />
        </div>

        <div className="space-y-6">
          <JoinSidePanel predictionId={debate.predictionId} debateSlug={debate.slug} />

          <Card>
            <CardHeader>
              <CardTitle>Evidence Cards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {evidence.map((item) => (
                <EvidenceCard key={item.id} item={item} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resolution Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/60">
                {debate.prediction.resolutionCriteria}
              </p>
            </CardContent>
          </Card>

          <ShareCard
            type="battle"
            title={debate.prediction.title}
            subtitle={`${debate.affirmativeAgent.name} vs ${debate.negativeAgent.name}`}
            slug={debate.slug}
          />
        </div>
      </div>
    </div>
  );
}
