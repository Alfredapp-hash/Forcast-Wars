import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildClassifierPrompt } from "@/lib/media-engine/prompts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { title, summary } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const prompt = buildClassifierPrompt(title, summary ?? "");

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      messages: [
        { role: "system", content: "You are Ark's Legal Issue Classifier. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Empty response");

    return NextResponse.json(JSON.parse(content), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[classify] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
