"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Edit } from "lucide-react";

interface ContentJob {
  id: string;
  predictionTitle: string;
  contentType: string;
  platform: string;
  script: string;
  caption: string;
  status: string;
  approvalStatus: string;
}

export function ContentAdminPanel() {
  const [jobs, setJobs] = useState<ContentJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/content-jobs");
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    await fetch("/api/content-jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, approvalStatus: status }),
    });
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status, approvalStatus: status } : j)),
    );
  };

  if (loading) {
    return <p className="text-white/50">Loading content queue...</p>;
  }

  if (jobs.length === 0) {
    return <p className="text-white/50">No content awaiting approval.</p>;
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <Card key={job.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{job.predictionTitle}</CardTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{job.platform}</Badge>
                <Badge variant="violet">{job.contentType}</Badge>
                <Badge variant={job.status === "approved" ? "yes" : "default"}>
                  {job.approvalStatus}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-white/40 mb-1">Script</p>
              <p className="text-sm text-white/80">{job.script}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Caption</p>
              <p className="text-sm text-white/60">{job.caption}</p>
            </div>
            {(job.status === "preview" || job.status === "draft") && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateStatus(job.id, "approved")}>
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button size="sm" variant="secondary">
                  <Edit className="h-4 w-4" />
                  Revise
                </Button>
                <Button size="sm" variant="no" onClick={() => updateStatus(job.id, "rejected")}>
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
