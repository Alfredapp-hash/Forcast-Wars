import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        arena: {
          bg: "#020817",
          surface: "rgba(15, 23, 42, 0.85)",
          cyan: "#06b6d4",
          violet: "#8b5cf6",
          yes: "#10b981",
          no: "#ef4444",
        },
      },
      boxShadow: {
        premium: "0 4px 24px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.06)",
        "premium-lg": "0 12px 40px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.08)",
        glow: "0 0 32px -8px rgba(6, 182, 212, 0.35)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        "fade-up": "fadeUp 0.5s ease-out forwards",
        shimmer: "shimmer 2.5s ease-in-out infinite",
        "live-pulse": "livePulse 2s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
        livePulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.92)" },
        },
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
