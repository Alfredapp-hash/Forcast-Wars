"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  size?: number;
}

/** Forecast Wars mark — crossed forecast blades + horizon arc */
export function LogoMark({ className, size = 32 }: LogoMarkProps) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-blade-a`} x1="6" y1="42" x2="26" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id={`${uid}-blade-b`} x1="42" y1="42" x2="22" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={`${uid}-horizon`} x1="4" y1="38" x2="44" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06b6d4" stopOpacity="0" />
          <stop offset="0.5" stopColor="#06b6d4" stopOpacity="0.85" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <radialGradient
          id={`${uid}-core`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(24 19) rotate(90) scale(6)"
        >
          <stop stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M 8 37.5 Q 24 31 40 37.5"
        stroke={`url(#${uid}-horizon)`}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M 11 40 L 22.5 9.5 L 25 11 L 13.5 40 Z" fill={`url(#${uid}-blade-a)`} opacity="0.95" />
      <path d="M 9 36 L 20 12" stroke={`url(#${uid}-blade-a)`} strokeWidth="2.25" strokeLinecap="round" />
      <path d="M 37 40 L 25.5 9.5 L 23 11 L 34.5 40 Z" fill={`url(#${uid}-blade-b)`} opacity="0.95" />
      <path d="M 39 36 L 28 12" stroke={`url(#${uid}-blade-b)`} strokeWidth="2.25" strokeLinecap="round" />
      <rect x="20" y="33" width="8" height="2.5" rx="1.25" fill="#0f172a" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <rect x="22.75" y="30.5" width="2.5" height="7" rx="1.25" fill="#0f172a" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
      <circle cx="24" cy="19" r="3.25" fill={`url(#${uid}-core)`} filter={`url(#${uid}-glow)`} />
      <circle cx="24" cy="19" r="1.25" fill="#f0fdff" />
    </svg>
  );
}
