import type { MetadataRoute } from "next";
import { fetchLiveDebates, fetchAgents } from "@/lib/data";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/arena`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/agents`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/predictions/new`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/disclaimer`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const [debates, agents] = await Promise.all([fetchLiveDebates(), fetchAgents()]);

  const debateRoutes: MetadataRoute.Sitemap = debates.map((debate) => ({
    url: `${base}/arena/${debate.slug}`,
    lastModified: now,
    changeFrequency: "hourly",
    priority: 0.85,
  }));

  const agentRoutes: MetadataRoute.Sitemap = agents.map((agent) => ({
    url: `${base}/agents/${agent.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  return [...staticRoutes, ...debateRoutes, ...agentRoutes];
}
