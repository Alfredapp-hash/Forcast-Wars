import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildScriptGenerationPrompt } from "@/lib/media-engine/prompts";
import { GenerateScriptsRequest } from "@/lib/media-engine/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body: GenerateScriptsRequest = await req.json();
    const { topic } = body;

    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    const prompt = buildScriptGenerationPrompt(topic);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      messages: [
        { role: "system", content: "You are Ark, the autonomous content creator for The Arkhe Project. Return only valid JSON. No markdown, no extra text." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Empty response from model");

    const scripts = JSON.parse(content);

    return NextResponse.json({ scripts }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
