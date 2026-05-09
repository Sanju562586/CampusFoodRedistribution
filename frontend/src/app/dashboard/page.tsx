"use client";

import { useEffect, useState, useRef, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import FluidFoodCard, { getFoodImage } from "@/components/FluidFoodCard";
import ReserveModal from "@/components/ReserveModal";
import BrandLogo from "@/components/BrandLogo";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAuth, clearAuth } from "@/lib/auth";
import PusherLib from "pusher-js";

// ── Pusher singleton ────────────────────────────────────────────────────────
// Created ONCE at module level so React StrictMode's double-mount/unmount
// cycle never kills a mid-flight WebSocket handshake.
// The connection persists for the lifetime of the browser tab.
let _pusher: PusherLib | null = null;
function getPusher(): PusherLib | null {
  if (typeof window === "undefined") return null; // SSR guard
  if (_pusher) return _pusher;
  const key     = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;
  _pusher = new PusherLib(key, {
    cluster,
    // Allow Pusher to choose between ws/wss and xhr_streaming fallback automatically
  });
  return _pusher;
}

import ProfileTab from "@/components/ProfileTab";
import { ModeToggle } from "@/components/mode-toggle";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Search,
  Bell,
  MessageSquare,
  User,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  MapPin,
  LogOut,
  Sparkles,
  Leaf,
  Zap,
  Droplets,
  X,
  TreePine,
  TrendingUp,
} from "lucide-react";

const CATEGORIES = ["All Food", "Main Course", "Desserts", "Fruits"];
type SortOrder = "expiry" | "newest" | "quantity";

// ── Animation variants ─────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const, delay: i * 0.08 },
  }),
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" as const } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};


// ── Animated integer counter ───────────────────────────────────────────────
function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const step = Math.ceil(value / 30);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display}</>;
}

// ── Trending card — uses real top food item ────────────────────────────────
function TrendingNearbyCard({ topFood }: { topFood: any | null }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  if (!topFood) return null;
  return (
    <>
      <ReserveModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        food={topFood}
      />
      <motion.div
        variants={fadeUp}
        custom={0}
        whileHover={{ scale: 1.012, y: -4 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative rounded-3xl overflow-hidden min-h-[220px] h-full cursor-pointer"
      >
        {/* Background */}
        <img
          src={getFoodImage(topFood)}
          alt={topFood.name}
          className="absolute inset-0 w-full h-full object-cover opacity-75"
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.10) 0%, transparent 55%)" }} />
        <div className="absolute inset-0 rounded-3xl border border-white/15 pointer-events-none" />
        {/* Content */}
        <div className="absolute inset-0 p-6 flex flex-col justify-end">
          <span className="inline-block glass-pill text-white text-[11px] font-bold px-3 py-1 rounded-full w-fit mb-2 uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.15)" }}>
            🔥 Trending
          </span>
          <h4 className="text-xl font-black text-white leading-tight mb-1">{topFood.name}</h4>
          <p className="text-xs text-white/75 mb-4 leading-relaxed max-w-xs">
            {topFood.dining_hall || topFood.location || "Campus dining"} · {topFood.quantity} unit{topFood.quantity !== 1 ? "s" : ""} remaining.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="glass-btn text-white font-bold text-sm px-5 py-2.5 rounded-full w-fit"
            onClick={() => setIsModalOpen(true)}
          >
            Reserve Now
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ── Zero Waste Hero card — shows real student count ────────────────────────
function ZeroWasteCard({ activeStudents }: { activeStudents: number }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={1}
      whileHover={{ scale: 1.015, y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative glass-card rounded-3xl p-6 flex flex-col justify-between min-h-[200px] cursor-default overflow-hidden"
    >
      <div className="relative z-10">
        <span className="inline-block text-[10px] font-black text-orange-600 bg-orange-100 border border-orange-200 px-2.5 py-0.5 rounded-full uppercase tracking-widest mb-3">
          ⚡ Weekly Challenge
        </span>
        <h4 className="text-lg font-extrabold text-[#b5451b] leading-tight">
          Zero Waste Hero
        </h4>
        <p className="text-sm text-[#b5451b]/80 mt-2 leading-relaxed">
          Complete 5 orders this week to unlock the &apos;Veridian Guardian&apos; badge
          and earn 50 bonus impact points.
        </p>
      </div>
      <div className="flex items-center gap-2 mt-5 relative z-10">
        <div className="flex -space-x-2">
          {["🧑", "👩", "🧔"].map((emoji, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm border-2 border-white flex items-center justify-center text-sm shadow-sm"
            >
              {emoji}
            </motion.div>
          ))}
          {activeStudents > 3 && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="w-7 h-7 rounded-full bg-[#b5451b] border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm"
            >
              +{activeStudents > 99 ? "99" : activeStudents - 3}
            </motion.div>
          )}
        </div>
        <span className="text-xs text-[#b5451b] font-semibold">
          {activeStudents} student{activeStudents !== 1 ? "s" : ""} participating
        </span>
      </div>
    </motion.div>
  );
}

// ── AI Recommendation Card ─────────────────────────────────────────────────
function AiRecCard({ food, onView }: { food: any; onView: (id: number) => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const hoursLeft = Math.max(0, (new Date(food.expiry_time).getTime() - Date.now()) / 3_600_000);
  const urgency = hoursLeft < 2 ? "red" : hoursLeft < 4 ? "orange" : "green";
  const urgencyColor = { red: "bg-red-100 text-red-700", orange: "bg-orange-100 text-orange-700", green: "bg-green-100 text-green-700" }[urgency];
  const urgencyLabel = hoursLeft < 2 ? `${Math.round(hoursLeft * 60)}m left` : `${hoursLeft.toFixed(0)}h left`;

  const handleOpen = () => {
    onView(food.id);
    setModalOpen(true);
  };

  return (
    <>
      <ReserveModal open={modalOpen} onClose={() => setModalOpen(false)} food={food} />
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        onClick={handleOpen}
        className="cursor-pointer rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-sm hover:shadow-md transition-shadow h-full"
      >
        {/* Image */}
        <div className="relative h-28 overflow-hidden">
          <img src={getFoodImage(food)} alt={food.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {/* Urgency badge */}
          <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${urgencyColor}`}>
            ⏰ {urgencyLabel}
          </span>
          {/* Price badge */}
          <span className="absolute bottom-2 right-2 text-[11px] font-black text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
            ₹{food.price || 0}
          </span>
        </div>
        {/* Body */}
        <div className="p-3">
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-1">{food.name}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
            📍 {food.dining_hall || food.location}
          </p>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[10px] text-gray-400">{food.quantity} left</span>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={(e) => { e.stopPropagation(); handleOpen(); }}
              className="text-[11px] font-bold text-white bg-[#22c55e] hover:bg-[#16a34a] px-3 py-1 rounded-full transition-colors"
            >
              Reserve
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Main content ───────────────────────────────────────────────────────────
function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") === "profile" ? "profile" : "food";
  const [activeTab, setActiveTab] = useState(initialTab);
  const foodGridRef = useRef<HTMLDivElement>(null);

  const [foods, setFoods] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [activeStudents, setActiveStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All Food");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("expiry");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);

  // ── Smart Notifications ─────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── AI Recommendations ───────────────────────────────────────
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState("");
  const [aiType, setAiType] = useState<"personalized" | "scored" | "info" | "">("");
  const [showAiSection, setShowAiSection] = useState(true);

  // ── My Impact ───────────────────────────────────────────────
  const [impact, setImpact] = useState<any>(null);

  // ── Sync tab to URL so refresh restores position ─────────────────────────
  const switchTab = useCallback((tab: "food" | "profile") => {
    setActiveTab(tab);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (tab === "food") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(`/dashboard${query ? `?${query}` : ""}`, { scroll: false });
  }, [router, searchParams]);

  // Sync inbound URL changes (e.g. browser back/forward)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile" || tab === "food") setActiveTab(tab);
    else setActiveTab("food");
  }, [searchParams]);

  const filteredFoods = useMemo(() => {
    let list = foods.filter((f) => {
      const nameMatch = !searchQuery || f.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      let categoryMatch = true;
      if (selectedCategory === "Main Course") {
        categoryMatch = ["rice", "curry", "meal", "bowl", "bread", "roti", "dal", "sabzi", "biryani", "pasta", "noodle", "wrap"].some((k) =>
          f.name?.toLowerCase().includes(k)
        );
      } else if (selectedCategory === "Desserts") {
        categoryMatch = ["cake", "sweet", "halwa", "pudding", "kheer", "ladoo", "cookie", "brownie", "mithai", "dessert"].some((k) =>
          f.name?.toLowerCase().includes(k)
        );
      } else if (selectedCategory === "Fruits") {
        categoryMatch = ["fruit", "apple", "banana", "mango", "orange", "salad", "bowl", "berry", "grape"].some((k) =>
          f.name?.toLowerCase().includes(k)
        );
      }

      const locInfo = f.dining_hall || f.location || "Unknown";
      const locationMatch = selectedLocation === "All Locations" || locInfo === selectedLocation;

      return nameMatch && categoryMatch && locationMatch;
    });

    // Sort
    if (sortOrder === "expiry") {
      list = list.sort((a, b) => new Date(a.expiry_time).getTime() - new Date(b.expiry_time).getTime());
    } else if (sortOrder === "newest") {
      list = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOrder === "quantity") {
      list = list.sort((a, b) => b.quantity - a.quantity);
    }

    return list;
  }, [foods, searchQuery, selectedCategory, selectedLocation, sortOrder]);

  // Derived available locations from the foods list
  const availableLocations = useMemo(() => {
    const locs: string[] = [];
    foods.forEach((f) => {
      const l = f.dining_hall || f.location || "Unknown";
      if (!locs.includes(l)) locs.push(l);
    });
    return ["All Locations", ...locs.sort()];
  }, [foods]);

  // Trending = most reserved item
  const trendingFood = useMemo(() => {
    if (!foods.length) return null;
    return [...foods].sort((a, b) => (b.Reservations?.length || 0) - (a.Reservations?.length || 0))[0];
  }, [foods]);

  const fetchAiRecs = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await api.get("/ai/recommend");
      setAiRecs(res.data?.data || []);
      setAiReason(res.data?.message || "");
      setAiType(res.data?.type || "");
    } catch {
      setAiRecs([]);
    } finally {
      setAiLoading(false);
    }
  }, []);

  // Record a food view to the behavior engine (fire-and-forget)
  const recordView = useCallback((foodId: number) => {
    api.post("/ai/record-view", { foodId }).catch(() => {});
  }, []);

  const fetchData = async () => {
    try {
      const [foodRes, userRes, leaderboardRes] = await Promise.all([
        api.get("/food/available"),
        api.get("/auth/user/me").catch(() => ({ data: getAuth() })),
        api.get("/auth/leaderboard").catch(() => ({ data: [] })),
      ]);
      setFoods(foodRes.data);
      setUserInfo(userRes.data);
      // Fallback number based on leaderboard active top users
      setActiveStudents(leaderboardRes.data.length || 0);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchImpact = async () => {
    try {
      const res = await api.get("/ai/my-impact");
      setImpact(res.data);
    } catch { /* silent */ }
  };

  // ── Effect 1: Initial data load + polling heartbeat ──────────────────────
  // Polls every 30 s as a guaranteed fallback even if Pusher drops
  useEffect(() => {
    fetchData();
    fetchImpact();
    fetchAiRecs();

    // Polling heartbeat — catches any missed Pusher events
    const pollInterval = setInterval(() => {
      fetchData();       // refreshes food grid silently
      fetchImpact();     // refreshes points / impact
    }, 30_000);

    return () => clearInterval(pollInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Effect 2: Pusher real-time subscriptions ──────────────────────────────
  // Uses a module-level singleton — safe against React StrictMode double-mount.
  // Cleanup only removes event bindings, never destroys the connection.
  useEffect(() => {
    const pusher = getPusher();
    if (!pusher) return; // env vars missing or SSR

    const auth   = getAuth();
    const userId = auth?.id;

    // ── Public food channel ───────────────────────────────────
    const channel = pusher.subscribe("food-channel");

    const onFoodAdded = (newFood: any) => {
      setFoods((prev) => {
        if (prev.some((f) => f.id === newFood.id)) return prev;
        return [newFood, ...prev];
      });
      fetchAiRecs();
    };
    const onFoodUpdate = (data: { foodId: number; quantity: number }) => {
      setFoods((prev) =>
        prev.map((f) => f.id === data.foodId ? { ...f, quantity: data.quantity } : f)
      );
    };
    const onFoodRemoved = (data: { foodId: number }) => {
      setFoods((prev) => prev.filter((f) => f.id !== data.foodId));
      setAiRecs((prev) => prev.filter((f: any) => f.id !== data.foodId));
    };

    channel.bind("food_added",   onFoodAdded);
    channel.bind("food_update",  onFoodUpdate);
    channel.bind("food_removed", onFoodRemoved);

    // ── Private user channel ──────────────────────────────────
    let userChannel: ReturnType<typeof pusher.subscribe> | null = null;

    const onFoodNotif = (notif: any) => {
      setNotifications((prev) => [{ ...notif, seen: false }, ...prev].slice(0, 20));
      setShowNotifPanel(true);
      if (notifRef.current) clearTimeout(notifRef.current);
      notifRef.current = setTimeout(() => setShowNotifPanel(false), 8000);
    };
    const onReservationConfirmed = (data: { newPoints: number; foodName: string; code: string }) => {
      setUserInfo((prev: any) => prev ? { ...prev, points: data.newPoints } : prev);
      setNotifications((prev) => [{
        id: `res_${Date.now()}`,
        type: "reservation_confirmed",
        title: "✅ Reservation Confirmed!",
        message: `${data.foodName} · Code: ${data.code} · +10 pts`,
        seen: false,
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 20));
      setShowNotifPanel(true);
      if (notifRef.current) clearTimeout(notifRef.current);
      notifRef.current = setTimeout(() => setShowNotifPanel(false), 6000);
      fetchImpact();
    };
    const onPickupConfirmed = (data: { foodName: string }) => {
      fetchImpact();
      setNotifications((prev) => [{
        id: `pickup_${Date.now()}`,
        type: "pickup_confirmed",
        title: "🎉 Pickup Confirmed!",
        message: `${data.foodName || "Food item"} picked up successfully.`,
        seen: false,
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 20));
      setShowNotifPanel(true);
      if (notifRef.current) clearTimeout(notifRef.current);
      notifRef.current = setTimeout(() => setShowNotifPanel(false), 6000);
    };

    if (userId) {
      userChannel = pusher.subscribe(`user-${userId}`);
      userChannel.bind("food_notification",      onFoodNotif);
      userChannel.bind("reservation_confirmed",  onReservationConfirmed);
      userChannel.bind("pickup_confirmed",       onPickupConfirmed);
    }

    // Cleanup: unbind listeners only — DO NOT call pusher.disconnect()
    // Disconnecting would kill the singleton for every other component too.
    return () => {
      channel.unbind("food_added",   onFoodAdded);
      channel.unbind("food_update",  onFoodUpdate);
      channel.unbind("food_removed", onFoodRemoved);
      if (userChannel) {
        userChannel.unbind("food_notification",     onFoodNotif);
        userChannel.unbind("reservation_confirmed", onReservationConfirmed);
        userChannel.unbind("pickup_confirmed",      onPickupConfirmed);
      }
      if (notifRef.current) clearTimeout(notifRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const sortLabels: Record<SortOrder, string> = {
    expiry:   "Expiry Time",
    newest:   "Newest First",
    quantity: "Most Available",
  };

  // ── Loading ──
  if (!userInfo && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef8ee]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-full border-4 border-[#1a5c2e] border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading your dashboard…</p>
        </motion.div>
      </div>
    );
  }

  // ── Profile tab ──
  if (activeTab === "profile") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mac-page"
      >
        <div className="lg:hidden glass-header px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 z-40">
          <BrandLogo
            size={32}
            subtitle="Student Portal"
            titleClassName="text-[0.98rem]"
            wordmarkSize="sm"
          />
          <button onClick={() => switchTab("food")} className="w-9 h-9 rounded-full bg-[#1a5c2e]/10 flex items-center justify-center">
            <User className="w-5 h-5 text-[#1a5c2e]" />
          </button>
        </div>
        <div className="p-5 lg:p-8 w-full max-w-screen-2xl mx-auto min-h-[calc(100vh-80px)] flex flex-col">
          <ProfileTab user={userInfo || {}} onUpdate={fetchData} />
        </div>
      </motion.div>
    );
  }

  // ── Food browse ──
  return (
    <div className="mac-page">

      {/* ══ TOP HEADER ══ */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass-header px-5 lg:px-7 py-3.5 flex items-center gap-4 sticky top-0 z-30"
      >
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for fresh surplus food..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 focus:border-[#1a5c2e]/40 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Icons + user */}
        <div className="flex items-center gap-2 ml-auto">
          {/* 🔔 Smart Notification Bell */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative p-2 hover:bg-white rounded-full transition-colors"
              onClick={() => setShowNotifPanel(v => !v)}
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {notifications.filter(n => !n.seen).length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-[#eef8ee] flex items-center justify-center"
                >
                  <span className="text-[8px] font-black text-white px-0.5">
                    {notifications.filter(n => !n.seen).length > 9 ? "9+" : notifications.filter(n => !n.seen).length}
                  </span>
                </motion.span>
              )}
            </motion.button>

            {/* Notification Panel */}
            <AnimatePresence>
              {showNotifPanel && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#eef8ee] to-white">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#1a5c2e]" />
                      <p className="font-bold text-sm text-gray-800">Smart Notifications</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setNotifications(prev => prev.map(n => ({ ...n, seen: true })))} className="text-[10px] text-gray-400 hover:text-[#1a5c2e] font-semibold">Mark all read</button>
                      <button onClick={() => setShowNotifPanel(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">No notifications yet.</p>
                        <p className="text-[10px] text-gray-300 mt-1">You&apos;ll get notified when food matching your preferences is posted.</p>
                      </div>
                    ) : (
                      notifications.map((n: any, i: number) => (
                        <motion.div
                          key={n.id || i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!n.seen ? "bg-[#f0fdf4]" : ""}`}
                          onClick={() => setNotifications(prev => prev.map((x, xi) => xi === i ? { ...x, seen: true } : x))}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-xl mt-0.5">🍱</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800 leading-tight">{n.foodName}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{n.hall} · {n.quantity} units left</p>
                              <p className="text-[9px] text-gray-400 mt-1">{new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            {!n.seen && <span className="w-2 h-2 bg-green-500 rounded-full mt-1 shrink-0" />}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ModeToggle />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 hover:bg-white/60 rounded-full transition-colors"
            onClick={() => alert("Messages coming soon!")}
          >
            <MessageSquare className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 hover:bg-red-50 rounded-full transition-colors group ml-1"
            onClick={() => { clearAuth(); window.location.href = "/login"; }}
            title="Log Out"
          >
            <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-500 transition-colors" />
          </motion.button>

          <div
            className="hidden sm:flex items-center gap-2.5 pl-3 ml-1 border-l border-gray-200 cursor-pointer group"
            onClick={() => switchTab("profile")}
          >
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight group-hover:text-[#1a5c2e] dark:group-hover:text-emerald-400 transition-colors">
                {userInfo?.name || "Student"}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">Student Member</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.08 }}
              className="w-9 h-9 rounded-full bg-[#1a5c2e]/10 overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm"
            >
              {userInfo?.avatar_url ? (
                <img src={userInfo.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-[#1a5c2e]" />
              )}
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* ══ PAGE BODY ══ */}
      <div className="px-5 lg:px-7 py-6 max-w-screen-xl mx-auto">

        {/* ── HERO SECTION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mb-8">

          {/* Left: Greeting */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col justify-center"
          >
            <motion.p variants={fadeUp} className="text-xs font-bold text-[#22c55e] uppercase tracking-widest mb-3">
              CampusFood Network
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-gray-50 leading-tight mb-0.5">
              Hello, {userInfo?.name || "Student"}!
            </motion.h1>
            <motion.h2 variants={fadeUp} className="text-3xl lg:text-4xl font-black text-[#1a5c2e] dark:text-emerald-400 leading-tight mb-4">
              Find freshness around you.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
              Join the{" "}
              <span className="font-bold text-[#1a5c2e]">
                {activeStudents > 0 ? activeStudents.toLocaleString() : "…"} student{activeStudents !== 1 ? "s" : ""}
              </span>{" "}
              reducing waste today. Your next meal is waiting at a nearby collection point.
            </motion.p>
          </motion.div>

          {/* Right: AI Green Impact card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="relative bg-gradient-to-br from-[#1a5c2e] to-[#0e3d1d] rounded-2xl p-5 flex flex-col justify-between shadow-lg overflow-hidden"
          >
            {/* Background decorative circles */}
            <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/5 rounded-full" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-[#22c55e]/20 rounded-lg flex items-center justify-center">
                  <Leaf className="w-3.5 h-3.5 text-[#22c55e]" />
                </div>
                <p className="text-[10px] font-bold text-[#22c55e] uppercase tracking-widest">My Green Impact</p>
              </div>

              {impact ? (
                <>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                      className="text-4xl font-black text-white"
                    >
                      <AnimatedCounter value={parseFloat(impact.co2Saved) || 0} />
                    </motion.span>
                    <span className="text-sm font-bold text-white/60">kg CO₂ saved</span>
                  </div>
                  <p className="text-[11px] text-[#22c55e] font-semibold mb-4">{impact.envGrade}</p>

                  {/* Impact Stats Row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/10 rounded-xl p-2 text-center">
                      <TreePine className="w-3.5 h-3.5 text-green-300 mx-auto mb-1" />
                      <p className="text-sm font-black text-white">{impact.treesEquivalent}</p>
                      <p className="text-[9px] text-white/50 uppercase tracking-wider">Trees</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2 text-center">
                      <Zap className="w-3.5 h-3.5 text-yellow-300 mx-auto mb-1" />
                      <p className="text-sm font-black text-white">{impact.mealsSaved}</p>
                      <p className="text-[9px] text-white/50 uppercase tracking-wider">Meals</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2 text-center">
                      <Droplets className="w-3.5 h-3.5 text-blue-300 mx-auto mb-1" />
                      <p className="text-sm font-black text-white">{(impact.waterSaved / 1000).toFixed(1)}k</p>
                      <p className="text-[9px] text-white/50 uppercase tracking-wider">Litres</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1 mb-1">
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                      className="text-5xl font-black text-white"
                    >
                      <AnimatedCounter value={userInfo?.points ?? 0} />
                    </motion.span>
                    <span className="text-lg font-bold text-white/60">pts</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">Start reserving food to unlock your personalised green impact stats.</p>
                </>
              )}
            </div>

            {/* Points bar */}
            <div className="mt-4 relative z-10">
              {impact && (
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#22c55e]" />
                  <p className="text-[10px] text-[#22c55e] font-semibold">
                    {impact.streak > 0 ? `🔥 ${impact.streak}-day streak!` : "Make your first pickup to start a streak"}
                  </p>
                </div>
              )}
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((userInfo?.points ?? 0) / 100) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
                  className="h-full bg-gradient-to-r from-[#22c55e] to-[#4ade80] rounded-full"
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] text-white/40 font-semibold">{userInfo?.points ?? 0}/100 pts to next tier</p>
                <span className="text-base">🌿</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ══ AI RECOMMENDATIONS SECTION ══ */}
        {showAiSection && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mb-8"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-50 leading-tight">AI Picks For You</h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {aiType === "personalized" ? "🧠 Personalised from your history" :
                     aiType === "scored"       ? "⚡ Scored by expiry & availability" :
                     "Powered by Gemini AI"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={fetchAiRecs}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${aiLoading ? "animate-spin" : ""}`} />
                  {aiLoading ? "Analysing..." : "Refresh"}
                </motion.button>
                <button onClick={() => setShowAiSection(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* AI Reason */}
            {aiReason && !aiLoading && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-xs text-gray-500 dark:text-gray-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30 rounded-xl px-4 py-2.5 mb-4 leading-relaxed"
              >
                🧠 {aiReason}
              </motion.p>
            )}

            {/* Loading Skeleton */}
            {aiLoading && (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {[1,2,3].map(i => (
                  <div key={i} className="flex-shrink-0 w-56 h-48 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            )}

            {/* AI Rec Cards */}
            {!aiLoading && aiRecs.length === 0 && (
              <div className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/10 border border-violet-100 dark:border-violet-800/20 rounded-2xl px-5 py-4">
                <Sparkles className="w-5 h-5 text-violet-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Building your taste profile…</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Reserve or view a few food items and the AI will start personalising recommendations just for you.</p>
                </div>
              </div>
            )}

            {!aiLoading && aiRecs.length > 0 && (
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollSnapType: "x mandatory" }}>
                <AnimatePresence>
                  {aiRecs.map((food: any, idx: number) => (
                    <motion.div
                      key={food.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="flex-shrink-0 w-56"
                      style={{ scrollSnapAlign: "start" }}
                    >
                      <AiRecCard food={food} onView={recordView} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* ── CATEGORY TABS + SORT ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex items-center justify-between flex-wrap gap-3 mb-6"
        >
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                layout
                className={`relative px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                  selectedCategory === cat
                    ? "text-white"
                    : "bg-white dark:bg-white/8 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/15 hover:border-[#22c55e]/50 hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                {selectedCategory === cat && (
                  <motion.span
                    layoutId="category-active-bg"
                    className="absolute inset-0 bg-[#22c55e] rounded-full shadow-sm shadow-[#22c55e]/30"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{cat}</span>
              </motion.button>
            ))}
            
            {/* Location dropdown */}
            <div className="relative ml-2">
              <button
                onClick={() => setShowLocationMenu((p) => !p)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 border ${
                  selectedLocation !== "All Locations" 
                    ? "bg-[#eef8ee] dark:bg-emerald-900/30 text-[#1a5c2e] dark:text-emerald-400 border-[#1a5c2e]/40 dark:border-emerald-500/30" 
                    : "bg-white dark:bg-white/8 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/15 hover:border-[#22c55e]/50 hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="max-w-[120px] truncate">{selectedLocation}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showLocationMenu ? "rotate-180" : ""}`} />
              </button>
              
              <AnimatePresence>
                {showLocationMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 glass-dropdown rounded-xl py-1.5 z-20 min-w-[200px] max-h-60 overflow-y-auto"
                  >
                    {availableLocations.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => { setSelectedLocation(loc); setShowLocationMenu(false); }}
                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors hover:bg-[#eef8ee] dark:hover:bg-white/8 ${selectedLocation === loc ? "text-[#22c55e] font-bold" : "text-gray-700 dark:text-gray-300"}`}
                      >
                        {loc}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu((p) => !p)}
              className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-white/80 dark:bg-white/8 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/15"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Sort by:</span>
              <span className="text-[#22c55e] font-semibold">{sortLabels[sortOrder]}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg py-1.5 z-20 min-w-[160px]"
                >
                  {(Object.entries(sortLabels) as [SortOrder, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setSortOrder(key); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors hover:bg-[#eef8ee] dark:hover:bg-white/10 ${sortOrder === key ? "text-[#22c55e] font-bold" : "text-gray-700 dark:text-gray-300"}`}
                    >
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── FOOD SECTION HEADING ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex items-end justify-between mb-5"
          id="food-grid-section"
          ref={foodGridRef}
        >
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">All Available Food</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {foods.length > 0
                ? `${filteredFoods.length} item${filteredFoods.length !== 1 ? "s" : ""} available · sorted by ${sortLabels[sortOrder].toLowerCase()}`
                : "Curated surplus from campus dining halls and cafes."}
            </p>
          </div>
          <motion.button
            whileHover={{ x: 3 }}
            className="flex items-center gap-1 text-sm text-[#22c55e] font-semibold hover:underline whitespace-nowrap"
            onClick={() => {
              foodGridRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            View full list <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>

        {/* ── FOOD GRID ── */}
        {filteredFoods.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="text-center py-16 glass-card rounded-3xl"
          >
            <span className="text-5xl">🍽️</span>
            <h3 className="text-lg font-semibold mt-4 text-gray-700">
              No food available right now
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery
                ? `No results for "${searchQuery}". Try a different search.`
                : "Check back later for new listings!"}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="mt-3 text-sm text-[#22c55e] font-semibold hover:underline">
                Clear search
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredFoods.map((food: any) => (
                <motion.div
                  key={food.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className="h-full"
                >
                  <div onClick={() => recordView(food.id)}>
                    <FluidFoodCard food={food} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── BOTTOM PROMO SECTION ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 mt-8"
        >
          <TrendingNearbyCard topFood={trendingFood} />
          <ZeroWasteCard activeStudents={activeStudents} />
        </motion.div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRole="student">
      <Suspense
        fallback={
          <div className="mac-page flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-4 border-[#1a5c2e] border-t-transparent animate-spin" />
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}
