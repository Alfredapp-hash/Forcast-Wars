import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildMissionLogPrompt } from "@/lib/media-engine/prompts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const prompt = buildMissionLogPrompt({
      weekStart:         body.weekStart,
      weekEnd:           body.weekEnd,
      topicsFound:       body.topicsFound ?? 0,
      packagesCreated:   body.packagesCreated ?? 0,
      packagesApproved:  body.packagesApproved ?? 0,
      packagesRejected:  body.packagesRejected ?? 0,
      packagesPosted:    body.packagesPosted ?? 0,
      bestPerformer:     body.bestPerformer ?? "",
      worstPerformer:    body.worstPerformer ?? "",
      totalCost:         body.totalCost ?? 0,
      totalRevenue:      body.totalRevenue ?? 0,
      topicTitles:       body.topicTitles ?? [],
    });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Ark, writing your mission log. Be honest, analytical, and transparent. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.75,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Empty response");

    return NextResponse.json(JSON.parse(content), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[mission-log] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
