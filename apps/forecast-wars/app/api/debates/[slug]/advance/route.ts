import { NextResponse } from "next/server";

const HERMES_URL = process.env.HERMES_URL ?? "http://localhost:4000";

export async function POST(
  request: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const body = await request.json();

    const envelope = {
      source: "webhook",
      role: "system",
      payload: {
        eventType: "debate.advance_round",
        predictionSlug: params.slug,
        ...body,
      },
      routingHint: "debate",
    };

    const res = await fetch(`${HERMES_URL}/gateway/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
