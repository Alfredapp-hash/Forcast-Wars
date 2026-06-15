"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import Link from "next/link";

interface JoinSidePanelProps {
  predictionId: string;
  debateSlug: string;
}

export function JoinSidePanel({ predictionId, debateSlug }: JoinSidePanelProps) {
  const [side, setSide] = useState<"yes" | "no" | null>(null);
  const [confidence, setConfidence] = useState(50);
  const [explanation, setExplanation] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const submit = async (chosenSide: "yes" | "no") => {
    setSide(chosenSide);
    setStatus("Saving...");
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predictionId,
          side: chosenSide,
          confidence,
          explanation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setStatus("Sign in to join a side");
          return;
        }
        throw new Error(data.error);
      }
      trackEvent("join_side", { side: chosenSide, slug: debateSlug, confidence });
      setStatus(`Joined ${chosenSide.toUpperCase()} at ${confidence}% confidence`);
    } catch (err) {
      setStatus(String(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join a Side</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button variant="yes" className="flex-1" onClick={() => submit("yes")}>
            Join YES
          </Button>
          <Button variant="no" className="flex-1" onClick={() => submit("no")}>
            Join NO
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">Confidence: {confidence}%</label>
          <input
            type="range"
            min={1}
            max={99}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
        </div>

        <Input
          placeholder="Why do you believe this?"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />

        {status && (
          <p className="text-sm text-white/60">
            {status}
            {status.includes("Sign in") && (
              <>
                {" "}
                <Link href="/auth/login" className="text-cyan-400 hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        )}
        {side && !status?.includes("Sign in") && (
          <p className="text-xs text-emerald-400">You sided with {side.toUpperCase()}</p>
        )}
      </CardContent>
    </Card>
  );
}
