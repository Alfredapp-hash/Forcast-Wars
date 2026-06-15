"use client";

import { Swords, Share2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";

interface ShareCardProps {
  type: "battle" | "called_it" | "agent_badge";
  title: string;
  subtitle?: string;
  slug?: string;
}

export function ShareCard({ type, title, subtitle, slug }: ShareCardProps) {
  const handleShare = async () => {
    const url = slug
      ? `${window.location.origin}/arena/${slug}`
      : window.location.href;

    trackEvent("share_battle", { type, title, slug });

    if (navigator.share) {
      await navigator.share({ title, text: subtitle, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const Icon = type === "battle" ? Swords : type === "called_it" ? Award : Share2;

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-cyan-400" />
          <div>
            <p className="font-medium text-sm">{title}</p>
            {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </CardContent>
    </Card>
  );
}
