"use client";

import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import { motion } from "framer-motion";
import { HomeIcon, TicketIcon, TrophyIcon, LogOutIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuth, clearAuth } from "@/lib/auth";

export default function Sidebar() {
  const [points, setPoints] = useState(0);

  useEffect(() => {
    const user = getAuth();
    if (!user?.points) return;

    const timeoutId = window.setTimeout(() => {
      setPoints(user.points ?? 0);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 bg-card border-r border-border p-6 hidden md:block"
    >
      <BrandLogo className="mb-8" size={36} subtitle="Food Rescue Network" wordmarkSize="sm" />

      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">My Impact</p>
        <p className="text-2xl font-bold text-green-500">{points} pts</p>
      </div>

      <nav className="space-y-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
        >
          <HomeIcon className="size-5" />
          <span className="font-medium">Browse Food</span>
        </Link>
        <Link
          href="/dashboard/reservations"
          className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
        >
          <TicketIcon className="size-5" />
          <span className="font-medium">My Reservations</span>
        </Link>
        <Link
          href="/dashboard/leaderboard"
          className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
        >
          <TrophyIcon className="size-5" />
          <span className="font-medium">Leaderboard</span>
        </Link>
        <button
          onClick={() => {
            clearAuth();
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
        >
          <LogOutIcon className="size-5" />
          <span className="font-medium">Logout</span>
        </button>
      </nav>
    </motion.aside>
  );
}
