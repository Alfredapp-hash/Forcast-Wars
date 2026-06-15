import { NextResponse } from "next/server";
import { calculateUserReputation } from "@/lib/reputation/scoring";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { predictionId, side, confidence, outcome, lockedAt, deadlineAt, userId } = body;

    const result = calculateUserReputation({
      userId,
      predictionId,
      side,
      confidence,
      outcome,
      lockedAt,
      deadlineAt,
    });

    return NextResponse.json({
      ...result,
      predictionId,
      userId,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
