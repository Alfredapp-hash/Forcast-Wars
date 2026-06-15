import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { EvidenceItem } from "@/lib/types";
import { ExternalLink, CheckCircle, AlertCircle, HelpCircle } from "lucide-react";

interface EvidenceCardProps {
  item: EvidenceItem;
  className?: string;
}

const statusIcon = {
  verified: CheckCircle,
  disputed: AlertCircle,
  unverified: HelpCircle,
};

const statusColor = {
  verified: "text-emerald-400",
  disputed: "text-amber-400",
  unverified: "text-white/40",
};

export function EvidenceCard({ item, className }: EvidenceCardProps) {
  const Icon = statusIcon[item.verifiedStatus];

  return (
    <div className={cn("glass-card rounded-lg p-4 space-y-2", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-white hover:text-cyan-400 flex items-center gap-1"
          >
            {item.title}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
          <p className="text-xs text-white/50 mt-1 line-clamp-2">{item.summary}</p>
        </div>
        <Icon className={cn("h-4 w-4 shrink-0", statusColor[item.verifiedStatus])} />
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={item.side === "yes" ? "yes" : "no"}>
          {item.side.toUpperCase()}
        </Badge>
        <span className="text-xs text-white/40">
          Quality: {item.sourceQualityScore}/100
        </span>
      </div>
    </div>
  );
}
