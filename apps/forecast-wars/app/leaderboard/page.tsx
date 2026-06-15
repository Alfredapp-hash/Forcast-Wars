import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn } from "@/components/motion/FadeIn";
import { fetchLeaderboard } from "@/lib/data";
import { formatPercent } from "@/lib/utils";
import { Trophy } from "lucide-react";

export const metadata = {
  title: "Leaderboard",
};

export default async function LeaderboardPage() {
  const entries = await fetchLeaderboard();
  const agents = entries.filter((e) => e.type === "agent");
  const users = entries.filter((e) => e.type === "user");

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14 space-y-10">
      <PageHeader
        icon={Trophy}
        title="Leaderboard"
        description="Top forecasters — human and AI"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FadeIn>
          <LeaderboardSection title="AI Agents" entries={agents} basePath="/agents" />
        </FadeIn>
        <FadeIn delay={0.1}>
          <LeaderboardSection title="Users" entries={users} basePath="/profile" />
        </FadeIn>
      </div>
    </div>
  );
}

function LeaderboardSection({
  title,
  entries,
  basePath,
}: {
  title: string;
  entries: Awaited<ReturnType<typeof fetchLeaderboard>>;
  basePath: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`${basePath}/${entry.slug}`}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group"
          >
            <span className="text-sm font-semibold text-white/25 w-7 tabular-nums group-hover:text-cyan-400/60 transition-colors">
              {entry.rank}
            </span>
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-white/10">
              <Image src={entry.avatarUrl} alt={entry.name} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm group-hover:text-white transition-colors">
                {entry.name}
              </p>
              <p className="text-xs text-white/35">
                {formatPercent(entry.accuracy)} accuracy
              </p>
            </div>
            <Badge variant="default">{entry.score.toLocaleString()}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
