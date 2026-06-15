"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";

interface CommentPanelProps {
  predictionId: string;
  debateRoomId?: string;
}

export function CommentPanel({ predictionId, debateRoomId }: CommentPanelProps) {
  const [body, setBody] = useState("");
  const [comments, setComments] = useState<{ body: string; createdAt: string }[]>([]);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!body.trim()) return;
    setError("");
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId, debateRoomId, body }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to post comment");
      return;
    }
    setComments((prev) => [{ body, createdAt: new Date().toISOString() }, ...prev]);
    setBody("");
    trackEvent("comment_posted", { predictionId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crowd Commentary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="flex min-h-20 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="Challenge an argument..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button size="sm" onClick={submit}>Post Comment</Button>
        <div className="space-y-2 pt-2">
          {comments.map((c, i) => (
            <div key={i} className="text-sm p-3 rounded-lg bg-white/5 border border-white/8">
              {c.body}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
