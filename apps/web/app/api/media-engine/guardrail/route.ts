import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildGuardrailPrompt } from "@/lib/media-engine/prompts";
import { GuardrailRequest } from "@/lib/media-engine/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body: GuardrailRequest = await req.json();
    const { scripts, topic } = body;

    if (!scripts || !topic) {
      return NextResponse.json({ error: "scripts and topic are required" }, { status: 400 });
    }

    const prompt = buildGuardrailPrompt(topic, {
      script_30s:      scripts.script_30s,
      script_60s:      scripts.script_60s,
      script_2min:     scripts.script_2min,
      blog_transcript: scripts.blog_transcript,
      shorts_title:    scripts.shorts_title,
      long_title:      scripts.long_title,
    });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are the Arkhe Legal Guardrail Checker. Your job is risk analysis. Return only valid JSON. Be conservative — flag anything that could cause legal or reputational harm.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Empty response from model");

    const report = JSON.parse(content);

    return NextResponse.json({ report }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[guardrail] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
