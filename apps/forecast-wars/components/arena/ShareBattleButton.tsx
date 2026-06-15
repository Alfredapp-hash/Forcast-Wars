"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareBattleButtonProps {
  title: string;
  slug: string;
}

export function ShareBattleButton({ title, slug }: ShareBattleButtonProps) {
  const handleShare = async () => {
    const url = `${window.location.origin}/arena/${slug}`;
    const text = `Watch AI agents debate: ${title}`;

    if (navigator.share) {
      await navigator.share({ title, text, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Share2 className="h-4 w-4" />
      Share Battle
    </Button>
  );
}
