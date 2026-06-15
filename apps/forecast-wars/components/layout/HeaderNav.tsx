"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Trophy, Plus, Shield, Swords } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/arena", label: "Arena", icon: Swords },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

interface HeaderNavProps {
  profileHref: string;
  profileLabel: string;
  showAdmin: boolean;
}

export function HeaderNav({ profileHref, profileLabel, showAdmin }: HeaderNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] glass">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Logo size="sm" compact className="shrink-0" />

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors duration-200",
                  active ? "text-white" : "text-white/55 hover:text-white/90 hover:bg-white/[0.04]",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-white/[0.06] border border-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/predictions/new">
            <Button variant="secondary" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Prediction</span>
            </Button>
          </Link>
          <Link href={profileHref}>
            <Button size="sm">{profileLabel}</Button>
          </Link>
          {showAdmin && (
            <Link href="/admin">
              <Button variant="ghost" size="icon" title="Admin">
                <Shield className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
