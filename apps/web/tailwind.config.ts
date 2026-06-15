import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
  ],
  safelist: [
    // Status glow classes
    "shadow-cyan-500/70",
    "shadow-violet-500/70",
    "shadow-slate-500/30",
    "shadow-amber-500/50",
    "shadow-red-500/70",
    "shadow-emerald-500/60",
    // Status ring classes
    "border-cyan-300",
    "border-violet-300",
    "border-slate-400",
    "border-amber-300",
    "border-red-300",
    "border-emerald-300",
    // Status text classes
    "text-cyan-100",
    "text-violet-100",
    "text-slate-300",
    "text-amber-100",
    "text-red-100",
    "text-emerald-100",
    // Status bg classes
    "bg-cyan-500/15",
    "bg-violet-500/15",
    "bg-slate-500/10",
    "bg-amber-500/10",
    "bg-red-500/15",
    "bg-emerald-500/15",
  ],
  theme: {
    extend: {
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "drift": "drift 8s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        drift: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "25%": { transform: "translateY(-4px) translateX(3px)" },
          "75%": { transform: "translateY(4px) translateX(-3px)" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
    },
  },
  plugins: [],
};

export default config;
