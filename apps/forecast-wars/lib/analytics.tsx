"use client";

import { useEffect } from "react";
import { initSentry } from "@/lib/sentry";

type PostHogLike = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    posthog?: PostHogLike;
  }
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.posthog) {
    window.posthog.capture(event, properties);
  }
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSentry();

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === "undefined") return;

    window.posthog = {
      capture: (event, properties) => {
        console.debug("[analytics]", event, properties);
      },
    };
  }, []);

  return <>{children}</>;
}
