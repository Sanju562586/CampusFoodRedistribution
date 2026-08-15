"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import ProtectedRoute from "@/components/ProtectedRoute";
import TiltSurface from "@/components/TiltSurface";
import { getAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Crown,
  Leaf,
  Star,
  TrendingUp,
  Search,
  Bell,
  MessageSquare,
  User,
  Medal,
  Sparkles,
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────

function getRankStyle(rank: number) {
  if (rank === 1) return { bg: "bg-gradient-to-r from-amber-400 to-yellow-500", text: "text-[#07120d]", glow: "shadow-[0_0_24px_rgba(245,158,11,0.5)]", icon: <Crown className="w-4 h-4 text-amber-950" /> };
  if (rank === 2) return { bg: "bg-gradient-to-r from-slate-300 to-slate-400", text: "text-slate-950", glow: "shadow-[0_0_20px_rgba(148,163,184,0.4)]", icon: <Medal className="w-4 h-4 text-slate-900" /> };
  if (rank === 3) return { bg: "bg-gradient-to-r from-amber-600 to-amber-700", text: "text-white", glow: "shadow-[0_0_20px_rgba(180,83,9,0.4)]", icon: <Medal className="w-4 h-4 text-amber-100" /> };
  return { bg: "bg-gray-200 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", glow: "", icon: null };
}

function getInitials(name: string): string {
  return name
    .split(/[\s._@]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "bg-emerald-600", "bg-purple-600", "bg-sky-600",
  "bg-amber-600", "bg-rose-600", "bg-teal-600",
];

// ── animated counter ───────────────────────────────────────────────────────
function AnimatedCounter({ value, delay = 0 }: { value: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const timeout = setTimeout(() => {
      let n = 0;
      const step = Math.ceil(value / 30);
      const interval = setInterval(() => {
        n += step;
        if (n >= value) { setDisplay(value); clearInterval(interval); }
        else setDisplay(n);
      }, 28);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return <>{display}</>;
}

// ── 3D Podium card (top 3) ──────────────────────────────────────────────────
function PodiumCard({
  user, rank, delay,
}: {
  user: any; rank: number; delay: number;
}) {
  const heights = ["h-36", "h-28", "h-22"];
  const podiumH = heights[rank - 1] ?? "h-22";
  const { bg, glow, icon } = getRankStyle(rank);
  const initials = getInitials(user.name);
  const avatarColor = AVATAR_COLORS[(rank - 1) % AVATAR_COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={`flex flex-col items-center ${rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}
    >
      <TiltSurface intensity={8} className="flex flex-col items-center">
        {/* Avatar */}
        <div className="relative mb-3">
          <motion.div
            whileHover={{ scale: 1.12 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className={`${rank === 1 ? "w-20 h-20 border-4 border-amber-300" : "w-14 h-14 border-2 border-white/40"} rounded-full ${avatarColor} flex items-center justify-center text-white font-black ${rank === 1 ? "text-2xl" : "text-lg"} ${glow} shadow-xl relative overflow-hidden`}
          >
            <span className="relative z-10">{initials}</span>
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </motion.div>
          
          {/* Rank Badge */}
          <div className={`absolute -bottom-1.5 -right-1.5 ${rank === 1 ? "w-7 h-7" : "w-6 h-6"} ${bg} rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-900`}>
            {rank <= 3 ? icon : <span className="text-[10px] font-black text-white">{rank}</span>}
          </div>
        </div>

        {/* Name + pts */}
        <p className={`font-extrabold text-gray-900 dark:text-gray-100 mb-0.5 text-center leading-tight max-w-[100px] truncate ${rank === 1 ? "text-base" : "text-xs"}`}>
          {user.name}
        </p>
        <p className={`font-black text-emerald-600 dark:text-emerald-400 mb-3 ${rank === 1 ? "text-lg" : "text-xs"}`}>
          <AnimatedCounter value={user.points} delay={delay + 0.2} /> pts
        </p>

        {/* Podium block */}
        <div className={`w-24 sm:w-28 ${podiumH} ${bg} rounded-t-2xl flex items-start justify-center pt-2.5 ${glow} border-t border-white/40`}>
          <span className="font-black text-2xl tracking-tighter shadow-sm">{rank}</span>
        </div>
      </TiltSurface>
    </motion.div>
  );
}

// ── main component ─────────────────────────────────────────────────────────
function LeaderboardContent() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const me = getAuth();
    if (me) setCurrentUser(me);

    api
      .get("/auth/leaderboard")
      .then((res) => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const top3 = users.slice(0, 3);
  const rest = users.slice(3).filter((u) =>
    !search || u.name.toLowerCase().includes(search.toLowerCase())
  );
  const myRank = users.findIndex((u) => u.id === currentUser?.id) + 1;
  const myPoints = users.find((u) => u.id === currentUser?.id)?.points ?? currentUser?.points ?? 0;

  const totalPoints = users.reduce((sum, u) => sum + (u.points ?? 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* ══ TOP HEADER ══ */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass-header px-5 lg:px-7 py-3.5 flex items-center gap-4 sticky top-0 z-30"
      >
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students on leaderboard..."
              className="w-full pl-10 pr-4 py-2.5 bg-background/80 rounded-full border border-border text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden sm:flex items-center gap-2.5 pl-3 ml-1 border-l border-border">
            <div className="text-right">
              <p className="text-sm font-bold leading-tight">{currentUser?.name || "Student"}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Student Member</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border-2 border-emerald-500/30">
              <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
      </motion.header>

      <div className="px-5 lg:px-7 py-6 max-w-screen-xl mx-auto space-y-8">
        {/* ══ PAGE HEADING ══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 glass-pill px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" /> Impact Rankings
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3 mt-1">
            <Trophy className="w-8 h-8 text-amber-400" />
            Campus Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Students ranked by total sustainability impact points earned through rescued meals.
          </p>
        </motion.div>

        {/* ══ 3D STAT CARDS ══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            {
              label: "Your Rank",
              value: myRank > 0 ? `#${myRank}` : "—",
              sub: `of ${users.length} students`,
              icon: <TrendingUp className="w-4 h-4" />,
              gradient: "from-emerald-500 to-teal-600",
            },
            {
              label: "Your Points",
              value: myPoints,
              sub: "impact points",
              icon: <Star className="w-4 h-4" />,
              gradient: "from-purple-500 to-indigo-600",
              animate: true,
            },
            {
              label: "Top Score",
              value: users[0]?.points ?? 0,
              sub: users[0]?.name ?? "—",
              icon: <Crown className="w-4 h-4" />,
              gradient: "from-amber-400 to-yellow-600",
              animate: true,
            },
            {
              label: "Total Points",
              value: totalPoints,
              sub: "community-wide",
              icon: <Leaf className="w-4 h-4" />,
              gradient: "from-sky-500 to-blue-600",
              animate: true,
            },
          ].map(({ label, value, sub, icon, gradient, animate }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
            >
              <TiltSurface intensity={5}>
                <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-white/10 shadow-lg cursor-default">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white mb-3 shadow-md`}>
                    {icon}
                  </div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-2xl font-black text-foreground leading-tight">
                    {animate && typeof value === "number" ? (
                      <AnimatedCounter value={value} delay={0.3 + i * 0.07} />
                    ) : value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>
                </div>
              </TiltSurface>
            </motion.div>
          ))}
        </motion.div>

        {/* ══ 3D PODIUM (top 3) ══ */}
        {!loading && top3.length >= 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/40 dark:border-white/10 shadow-xl overflow-hidden relative">
              <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center mb-8 flex items-center justify-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" /> Hall of Fame — Top 3 Champions
              </p>

              {/* Podium Stage */}
              <div className="flex items-end justify-center gap-4 sm:gap-8 pt-4 pb-2">
                {top3.map((user, idx) => (
                  <PodiumCard key={user.id} user={user} rank={idx + 1} delay={0.35 + idx * 0.1} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══ FULL RANKINGS LIST ══ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-tight">All Campus Rankings</h2>
            <span className="text-xs font-bold text-muted-foreground glass-pill px-3 py-1 rounded-full">{users.length} Students</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 glass-card rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div layout className="space-y-3">
                {users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase())).map((user, idx) => {
                  const rank = idx + 1;
                  const { bg, glow, text } = getRankStyle(rank);
                  const isMe = user.id === currentUser?.id;
                  const initials = getInitials(user.name);
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const barWidth = users[0]?.points > 0 ? Math.round((user.points / users[0].points) * 100) : 0;

                  return (
                    <motion.div
                      key={user.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, delay: idx * 0.04 }}
                    >
                      <TiltSurface intensity={3}>
                        <div
                          className={`glass-card rounded-2xl p-4 border transition-all ${
                            isMe
                              ? "border-emerald-500/50 bg-emerald-500/[0.06] ring-2 ring-emerald-500/20"
                              : "border-white/30 dark:border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Rank Badge */}
                            <div className={`w-10 h-10 ${bg} rounded-full flex items-center justify-center font-black text-sm ${text} ${glow} flex-shrink-0 shadow-sm`}>
                              {rank}
                            </div>

                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-md`}>
                              {initials}
                            </div>

                            {/* Name & Progress */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <p className="text-sm font-extrabold truncate">{user.name}</p>
                                {isMe && (
                                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${barWidth}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + idx * 0.04 }}
                                  className={`h-full rounded-full ${rank <= 3 ? bg : "bg-emerald-500"}`}
                                />
                              </div>
                            </div>

                            {/* Points */}
                            <div className="text-right flex-shrink-0 pl-2">
                              <p className="text-lg font-black text-foreground">
                                <AnimatedCounter value={user.points} delay={0.2 + idx * 0.04} />
                              </p>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">pts</p>
                            </div>
                          </div>
                        </div>
                      </TiltSurface>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ProtectedRoute allowedRole="student">
      <LeaderboardContent />
    </ProtectedRoute>
  );
}
