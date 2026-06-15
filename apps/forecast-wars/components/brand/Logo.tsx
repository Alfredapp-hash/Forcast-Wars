import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoMark } from "./LogoMark";

interface LogoProps {
  className?: string;
  markClassName?: string;
  /** sm: header · md: footer · lg: hero */
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  /** Hide wordmark on small screens (header) */
  compact?: boolean;
  href?: string;
}

const MARK_SIZE = { sm: 32, md: 36, lg: 44 } as const;

export function Logo({
  className,
  markClassName,
  size = "sm",
  showWordmark = true,
  compact = false,
  href = "/",
}: LogoProps) {
  const markSize = MARK_SIZE[size];

  const content = (
    <>
      <span
        className={cn(
          "relative flex items-center justify-center rounded-xl",
          "bg-gradient-to-br from-cyan-500/10 via-slate-900/40 to-violet-500/10",
          "border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          "transition-all duration-300 group-hover:border-cyan-500/25 group-hover:shadow-glow",
          size === "sm" && "h-9 w-9",
          size === "md" && "h-10 w-10",
          size === "lg" && "h-12 w-12",
          markClassName,
        )}
      >
        <LogoMark size={markSize - (size === "lg" ? 4 : 6)} />
      </span>
      {showWordmark && (
        <span className={cn("flex flex-col leading-none", compact && "hidden sm:flex")}>
          <span
            className={cn(
              "font-semibold tracking-tight text-white",
              size === "sm" && "text-[15px]",
              size === "md" && "text-base",
              size === "lg" && "text-xl",
            )}
          >
            Forecast{" "}
            <span className="text-gradient font-bold">Wars</span>
          </span>
          {size === "lg" && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/35 mt-1.5 font-medium">
              AI Debate Arena
            </span>
          )}
        </span>
      )}
    </>
  );

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 transition-opacity hover:opacity-95",
        className,
      )}
      aria-label="Forecast Wars home"
    >
      {content}
    </Link>
  );
}

/** Mark-only for compact spaces (favicon contexts, badges) */
export function LogoIcon({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg",
        "bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-white/10",
        className,
      )}
      style={{ width: size + 8, height: size + 8 }}
    >
      <LogoMark size={size} />
    </span>
  );
}
