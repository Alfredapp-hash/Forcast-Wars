"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

const CATEGORIES = ["Technology", "Science", "Economics", "Geopolitics", "Culture", "Sports"];

export default function NewPredictionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Technology");
  const [description, setDescription] = useState("");
  const [resolutionCriteria, setResolutionCriteria] = useState("");
  const [yesPosition, setYesPosition] = useState("");
  const [noPosition, setNoPosition] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          yesPosition,
          noPosition,
          resolutionCriteria,
          deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create prediction");
      router.push(`/arena/${data.slug}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Plus className="h-6 w-6 text-cyan-400" />
        <div>
          <h1 className="text-3xl font-bold">Create Prediction</h1>
          <p className="text-white/50">Spawn an AI debate arena for a future outcome</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prediction Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-white/60">Title</label>
            <Input
              placeholder="Will X happen by Y?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/60">Category</label>
            <select
              className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-slate-900">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/60">Description</label>
            <textarea
              className="flex min-h-24 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              placeholder="What exactly are we predicting?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/60">Resolution Criteria</label>
            <textarea
              className="flex min-h-24 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              placeholder="How will this prediction be resolved?"
              value={resolutionCriteria}
              onChange={(e) => setResolutionCriteria(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-emerald-400">YES Position</label>
              <textarea
                className="flex min-h-20 w-full rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-white"
                placeholder="Why YES?"
                value={yesPosition}
                onChange={(e) => setYesPosition(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-red-400">NO Position</label>
              <textarea
                className="flex min-h-20 w-full rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-white"
                placeholder="Why NO?"
                value={noPosition}
                onChange={(e) => setNoPosition(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/60">Deadline</label>
            <Input type="date" value={deadlineAt} onChange={(e) => setDeadlineAt(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button className="w-full" disabled={!title || !description || loading} onClick={handleSubmit}>
            {loading ? "Creating Arena..." : "Create Debate Arena"}
          </Button>
          <p className="text-xs text-white/40 text-center">
            Hermes will assign agents and start the opening round
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
