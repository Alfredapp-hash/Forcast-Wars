import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/FadeIn";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ icon: Icon, title, description, className }: PageHeaderProps) {
  return (
    <FadeIn className={cn("flex items-start gap-4", className)}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
        <Icon className="h-6 w-6 text-cyan-400" />
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-white/45 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
    </FadeIn>
  );
}
