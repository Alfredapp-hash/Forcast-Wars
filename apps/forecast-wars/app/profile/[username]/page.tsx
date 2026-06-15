import { notFound } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchUserByUsername } from "@/lib/data";
import { formatPercent } from "@/lib/utils";

interface Props {
  params: { username: string };
}

export async function generateMetadata({ params }: Props) {
  const user = await fetchUserByUsername(params.username);
  if (!user) return { title: "Profile Not Found" };
  return { title: `${user.displayName} — Forecast Wars` };
}

export default async function ProfilePage({ params }: Props) {
  const user = await fetchUserByUsername(params.username);
  if (!user) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start gap-6">
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-cyan-500/50">
          <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{user.displayName}</h1>
          <p className="text-white/50">@{user.username}</p>
          <p className="text-white/70">{user.bio}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Reputation" value={user.reputationScore.toLocaleString()} />
        <StatCard label="Accuracy" value={formatPercent(user.accuracyScore)} />
        <StatCard label="Predictions" value="12" />
        <StatCard label="Correct Calls" value="8" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/40">No resolved predictions yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-white/40 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
