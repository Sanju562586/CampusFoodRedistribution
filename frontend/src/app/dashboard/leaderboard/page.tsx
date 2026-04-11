"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import ProtectedRoute from "@/components/ProtectedRoute";
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
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────

function getRankStyle(rank: number) {
  if (rank === 1) return { bg: "bg-[#FFB800]", text: "text-white", glow: "shadow-[0_0_20px_rgba(255,184,0,0.5)]", icon: <Crown className="w-3.5 h-3.5 text-white" /> };
  if (rank === 2) return { bg: "bg-[#94A3B8]", text: "text-white", glow: "shadow-[0_0_16px_rgba(148,163,184,0.4)]", icon: <Medal className="w-3.5 h-3.5 text-white" /> };
  if (rank === 3) return { bg: "bg-[#CD7F32]", text: "text-white", glow: "shadow-[0_0_16px_rgba(205,127,50,0.4)]", icon: <Medal className="w-3.5 h-3.5 text-white" /> };
  return { bg: "bg-gray-100", text: "text-gray-500", glow: "", icon: null };
}

function getInitials(name: string): string {
  return name
    .split(/[\s._@]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "bg-[#1a5c2e]", "bg-[#6b21a8]", "bg-[#0369a1]",
  "bg-[#b45309]", "bg-[#be123c]", "bg-[#065f46]",
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

// ── Podium card (top 3) ────────────────────────────────────────────────────
function PodiumCard({
  user, rank, delay,
}: {
  user: any; rank: number; delay: number;
}) {
  const heights = ["h-28", "h-20", "h-14"];
  const podiumH = heights[rank - 1] ?? "h-14";
  const { bg, glow, icon } = getRankStyle(rank);
  const initials = getInitials(user.name);
  const avatarColor = AVATAR_COLORS[(rank - 1) % AVATAR_COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className={`flex flex-col items-center ${rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}
    >
      {/* Avatar */}
      <div className="relative mb-2">
        <motion.div
          whileHover={{ scale: 1.08 }}
          className={`${rank === 1 ? "w-16 h-16" : "w-12 h-12"} rounded-full ${avatarColor} flex items-center justify-center text-white font-black ${rank === 1 ? "text-xl" : "text-base"} ${glow} shadow-md`}
        >
          {initials}
        </motion.div>
        {/* rank badge */}
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${bg} rounded-full flex items-center justify-center shadow-md`}>
          {rank <= 3 ? icon : <span className="text-[9px] font-black text-white">{rank}</span>}
        </div>
      </div>

      {/* Name + pts */}
      <p className={`text-xs font-bold text-gray-800 mb-1 text-center leading-tight max-w-[80px] truncate ${rank === 1 ? "text-sm" : ""}`}>
        {user.name}
      </p>
      <p className={`text-xs font-black text-[#1a5c2e] mb-3 ${rank === 1 ? "text-base" : ""}`}>
        <AnimatedCounter value={user.points} delay={delay + 0.2} /> pts
      </p>

      {/* Podium block */}
      <div className={`w-20 ${podiumH} ${bg} rounded-t-xl flex items-start justify-center pt-1.5 ${glow}`}>
        <span className="text-white font-black text-lg">{rank}</span>
      </div>
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
  const myRank = users.findIndex((u) => u.name === currentUser?.name) + 1;
  const myPoints = users.find((u) => u.name === currentUser?.name)?.points ?? currentUser?.points ?? 0;

  const totalPoints = users.reduce((sum, u) => sum + (u.points ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#eef8ee]">

      {/* ══ TOP HEADER (matches main dashboard) ══ */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-[#eef8ee] px-5 lg:px-7 py-3.5 flex items-center gap-4 sticky top-0 z-30 border-b border-[#d4edda]"
      >
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students on leaderboard..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 focus:border-[#1a5c2e]/40 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="relative p-2 hover:bg-white rounded-full transition-colors">
            <Bell className="w-5 h-5 text-gray-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#eef8ee]" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 hover:bg-white rounded-full transition-colors">
            <MessageSquare className="w-5 h-5 text-gray-500" />
          </motion.button>
          <div className="hidden sm:flex items-center gap-2.5 pl-3 ml-1 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800 leading-tight">{currentUser?.name || "Student"}</p>
              <p className="text-[11px] text-gray-400 leading-tight">Student Member</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#1a5c2e]/10 flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
              <User className="w-5 h-5 text-[#1a5c2e]" />
            </div>
          </div>
        </div>
      </motion.header>

      <div className="px-5 lg:px-7 py-6 max-w-screen-xl mx-auto">

        {/* ══ PAGE HEADING ══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-7"
        >
          <p className="text-xs font-bold text-[#22c55e] uppercase tracking-widest mb-1">Impact Rankings</p>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-[#FFB800]" />
            Leaderboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">Students ranked by total impact points earned.</p>
        </motion.div>

        {/* ══ STAT CARDS ══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            {
              label: "Your Rank",
              value: myRank > 0 ? `#${myRank}` : "—",
              sub: `of ${users.length} students`,
              icon: <TrendingUp className="w-4 h-4" />,
              color: "bg-[#1a5c2e]",
            },
            {
              label: "Your Points",
              value: myPoints,
              sub: "impact points",
              icon: <Star className="w-4 h-4" />,
              color: "bg-[#6b21a8]",
              animate: true,
            },
            {
              label: "Top Score",
              value: users[0]?.points ?? 0,
              sub: users[0]?.name ?? "—",
              icon: <Crown className="w-4 h-4" />,
              color: "bg-[#FFB800]",
              animate: true,
            },
            {
              label: "Total Points",
              value: totalPoints,
              sub: "community-wide",
              icon: <Leaf className="w-4 h-4" />,
              color: "bg-[#0369a1]",
              animate: true,
            },
          ].map(({ label, value, sub, icon, color, animate }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-default"
            >
              <div className={`w-8 h-8 ${color} rounded-xl flex items-center justify-center text-white mb-3 shadow-sm`}>
                {icon}
              </div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">
                {animate && typeof value === "number" ? (
                  <AnimatedCounter value={value} delay={0.3 + i * 0.07} />
                ) : value}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ══ PODIUM (top 3) ══ */}
        {!loading && top3.length >= 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 pt-8 pb-0 overflow-hidden">
              <p className="text-xs font-bold text-[#22c55e] uppercase tracking-widest text-center mb-6">
                Hall of Fame — Top 3
              </p>

              {/* Podium stage */}
              <div className="flex items-end justify-center gap-4">
                {top3.map((user, idx) => (
                  <PodiumCard key={user.id} user={user} rank={idx + 1} delay={0.35 + idx * 0.1} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══ FULL RANKINGS LIST ══ */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-gray-900">All Rankings</h2>
            <span className="text-xs text-gray-400 font-medium">{users.length} students</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                layout
                className="space-y-2.5"
              >
                {/* Top 3 in list view */}
                {users.slice(0, 3).filter(u =>
                  !search || u.name.toLowerCase().includes(search.toLowerCase())
                ).map((user, idx) => {
                  const rank = idx + 1;
                  const { bg, glow, text } = getRankStyle(rank);
                  const isMe = user.name === currentUser?.name;
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
                      transition={{ duration: 0.3, delay: idx * 0.06 }}
                      whileHover={{ x: 4 }}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                        isMe ? "border-[#1a5c2e]/40 ring-1 ring-[#1a5c2e]/20" : "border-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-4 px-5 py-3.5">
                        {/* Rank badge */}
                        <div className={`w-9 h-9 ${bg} rounded-full flex items-center justify-center font-black text-sm ${text} ${glow} flex-shrink-0`}>
                          {rank}
                        </div>

                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm`}>
                          {initials}
                        </div>

                        {/* Name + bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-gray-800 truncate">{user.name}</p>
                            {isMe && (
                              <span className="text-[10px] font-black text-[#1a5c2e] bg-[#1a5c2e]/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 + idx * 0.06 }}
                              className={`h-full rounded-full ${bg}`}
                            />
                          </div>
                        </div>

                        {/* Points */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-black text-gray-900">
                            <AnimatedCounter value={user.points} delay={0.4 + idx * 0.06} />
                          </p>
                          <p className="text-[10px] text-gray-400 font-semibold">pts</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Rank 4+ */}
                {rest.map((user, idx) => {
                  const rank = idx + 4;
                  const isMe = user.name === currentUser?.name;
                  const initials = getInitials(user.name);
                  const avatarColor = AVATAR_COLORS[rank % AVATAR_COLORS.length];
                  const barWidth = users[0]?.points > 0 ? Math.round((user.points / users[0].points) * 100) : 0;

                  return (
                    <motion.div
                      key={user.id}
                      layout
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      whileHover={{ x: 4 }}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                        isMe ? "border-[#1a5c2e]/40 ring-1 ring-[#1a5c2e]/20" : "border-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-4 px-5 py-3.5">
                        {/* Rank number */}
                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center font-black text-sm text-gray-500 flex-shrink-0">
                          {rank}
                        </div>

                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm`}>
                          {initials}
                        </div>

                        {/* Name + bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-gray-700 truncate">{user.name}</p>
                            {isMe && (
                              <span className="text-[10px] font-black text-[#1a5c2e] bg-[#1a5c2e]/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 + idx * 0.04 }}
                              className="h-full bg-[#22c55e] rounded-full"
                            />
                          </div>
                        </div>

                        {/* Points */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-black text-gray-800">
                            <AnimatedCounter value={user.points} delay={0.1 + idx * 0.04} />
                          </p>
                          <p className="text-[10px] text-gray-400 font-semibold">pts</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Empty state */}
                {!loading && users.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200"
                  >
                    <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No rankings yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Start ordering to earn points!</p>
                  </motion.div>
                )}
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
