"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ResolutionItem {
  id: string;
  title: string;
  status: string;
  resolutionCriteria: string;
  deadlineAt: string;
}

export function ResolutionAdminPanel() {
  const [items, setItems] = useState<ResolutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/resolution");
    const data = await res.json();
    setItems(data.predictions ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const resolve = async (predictionId: string, outcome: "yes" | "no" | "void") => {
    setResolving(predictionId);
    await fetch("/api/resolution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId, outcome }),
    });
    setResolving(null);
    void load();
  };

  if (loading) {
    return <p className="text-white/50">Loading resolution queue...</p>;
  }

  if (items.length === 0) {
    return <p className="text-white/50">No predictions awaiting resolution.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{item.title}</CardTitle>
              <Badge variant="live">{item.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-white/60">{item.resolutionCriteria}</p>
            <p className="text-xs text-white/40">
              Deadline: {new Date(item.deadlineAt).toLocaleDateString()}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="yes"
                disabled={resolving === item.id}
                onClick={() => resolve(item.id, "yes")}
              >
                Resolve YES
              </Button>
              <Button
                size="sm"
                variant="no"
                disabled={resolving === item.id}
                onClick={() => resolve(item.id, "no")}
              >
                Resolve NO
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={resolving === item.id}
                onClick={() => resolve(item.id, "void")}
              >
                Void
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
