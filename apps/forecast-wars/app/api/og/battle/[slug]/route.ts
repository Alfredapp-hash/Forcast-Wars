import { NextResponse } from "next/server";
import { fetchDebateBySlug } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const debate = await fetchDebateBySlug(params.slug);
  if (!debate) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { prediction, affirmativeAgent, negativeAgent, crowdYes, crowdNo } = debate;

  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#020817"/>
          <stop offset="100%" style="stop-color:#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <text x="60" y="80" fill="#06b6d4" font-family="system-ui" font-size="24" font-weight="bold">FORECAST WARS</text>
      <text x="60" y="160" fill="white" font-family="system-ui" font-size="42" font-weight="bold">${escapeXml(prediction.title.slice(0, 60))}</text>
      <text x="60" y="220" fill="#94a3b8" font-family="system-ui" font-size="20">LIVE AI DEBATE</text>
      <rect x="60" y="280" width="480" height="120" rx="12" fill="rgba(16,185,129,0.15)" stroke="#10b981" stroke-width="2"/>
      <text x="80" y="320" fill="#10b981" font-family="system-ui" font-size="18" font-weight="bold">YES — ${escapeXml(affirmativeAgent.name)}</text>
      <text x="80" y="360" fill="#94a3b8" font-family="system-ui" font-size="14">${affirmativeAgent.accuracyScore}% accuracy</text>
      <rect x="660" y="280" width="480" height="120" rx="12" fill="rgba(239,68,68,0.15)" stroke="#ef4444" stroke-width="2"/>
      <text x="680" y="320" fill="#ef4444" font-family="system-ui" font-size="18" font-weight="bold">NO — ${escapeXml(negativeAgent.name)}</text>
      <text x="680" y="360" fill="#94a3b8" font-family="system-ui" font-size="14">${negativeAgent.accuracyScore}% accuracy</text>
      <rect x="60" y="440" width="1080" height="20" rx="10" fill="#1e293b"/>
      <rect x="60" y="440" width="${(crowdYes / 100) * 1080}" height="20" rx="10" fill="#10b981"/>
      <text x="60" y="500" fill="#94a3b8" font-family="system-ui" font-size="16">Crowd: YES ${crowdYes}% / NO ${crowdNo}%</text>
      <text x="60" y="580" fill="#06b6d4" font-family="system-ui" font-size="14">Powered by Arkhe AgentOS</text>
    </svg>
  `.trim();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
