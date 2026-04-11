"use client";

import { useEffect, useState, useRef, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import FluidFoodCard from "@/components/FluidFoodCard";
import BrandLogo from "@/components/BrandLogo";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAuth, clearAuth } from "@/lib/auth";
import Pusher from "pusher-js";
import ProfileTab from "@/components/ProfileTab";
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
  if (!topFood) return null;
  return (
    <motion.div
      variants={fadeUp}
      custom={0}
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative rounded-2xl overflow-hidden h-52 lg:h-full min-h-[200px] bg-gradient-to-br from-gray-700 to-gray-900 cursor-pointer"
    >
      {topFood.image_url ? (
        <img src={topFood.image_url} alt={topFood.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-15 text-[180px] select-none pointer-events-none">
          🥗
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="inline-block bg-[#22c55e] text-white text-[11px] font-bold px-3 py-1 rounded-full w-fit mb-2 uppercase tracking-wider"
        >
          🔥 Trending Nearby
        </motion.span>
        <h4 className="text-xl font-black text-white leading-tight mb-1">
          {topFood.name}
        </h4>
        <p className="text-xs text-white/75 mb-4 leading-relaxed max-w-xs">
          Available at {topFood.dining_hall || topFood.location || "campus dining"}.{" "}
          {topFood.quantity} unit{topFood.quantity !== 1 ? "s" : ""} remaining.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          className="bg-white text-gray-900 font-bold text-sm px-5 py-2.5 rounded-full w-fit hover:bg-gray-100 transition-colors"
          onClick={() => {
            const el = document.getElementById("food-grid-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Reserve Now
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Zero Waste Hero card — shows real student count ────────────────────────
function ZeroWasteCard({ activeStudents }: { activeStudents: number }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={1}
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="bg-[#fde8d8] rounded-2xl p-6 flex flex-col justify-between min-h-[200px] cursor-default"
    >
      <div>
        <h4 className="text-lg font-extrabold text-[#b5451b] leading-tight">
          Zero Waste Hero
        </h4>
        <p className="text-sm text-[#b5451b]/80 mt-2 leading-relaxed">
          Complete 5 orders this week to unlock the &apos;Veridian Guardian&apos; badge
          and earn 50 bonus impact points.
        </p>
      </div>
      <div className="flex items-center gap-2 mt-5">
        <div className="flex -space-x-2">
          {["🧑", "👩", "🧔"].map((emoji, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="w-7 h-7 rounded-full bg-white border-2 border-[#fde8d8] flex items-center justify-center text-sm shadow-sm"
            >
              {emoji}
            </motion.div>
          ))}
          {activeStudents > 3 && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="w-7 h-7 rounded-full bg-[#b5451b] border-2 border-[#fde8d8] flex items-center justify-center text-[10px] font-black text-white shadow-sm"
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

// ── Main content ───────────────────────────────────────────────────────────
function DashboardContent() {
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile" || tab === "food") setActiveTab(tab);
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

  const fetchData = async () => {
    try {
      const [foodRes, userRes, leaderboardRes] = await Promise.all([
        api.get("/food/available"),
        api.get("/auth/user/me").catch(() => ({ data: getAuth() })),
        api.get("/auth/users").catch(() => ({ data: [] })),
      ]);
      setFoods(foodRes.data);
      setUserInfo(userRes.data);
      const students = (leaderboardRes.data as any[]).filter((u: any) => u.role === "student");
      setActiveStudents(students.length);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    const channel = pusher.subscribe("food-channel");
    channel.bind("food_update", (data: { foodId: number; quantity: number }) => {
      setFoods((prev) => prev.map((food) => food.id === data.foodId ? { ...food, quantity: data.quantity } : food));
    });
    channel.bind("food_added", (newFood: any) => {
      setFoods((prev) => [newFood, ...prev]);
    });
    return () => { channel.unbind_all(); channel.unsubscribe(); };
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
        className="min-h-screen bg-[#eef8ee]"
      >
        <div className="lg:hidden bg-white px-5 pt-12 pb-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-40">
          <BrandLogo
            size={32}
            subtitle="Student Portal"
            titleClassName="text-[0.98rem]"
            wordmarkSize="sm"
          />
          <button onClick={() => setActiveTab("food")} className="w-9 h-9 rounded-full bg-[#1a5c2e]/10 flex items-center justify-center">
            <User className="w-5 h-5 text-[#1a5c2e]" />
          </button>
        </div>
        <div className="p-5 lg:p-8 max-w-3xl mx-auto">
          <ProfileTab user={userInfo || {}} onUpdate={fetchData} />
        </div>
      </motion.div>
    );
  }

  // ── Food browse ──
  return (
    <div className="min-h-screen bg-[#eef8ee]">

      {/* ══ TOP HEADER ══ */}
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for fresh surplus food..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 focus:border-[#1a5c2e]/40 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Icons + user */}
        <div className="flex items-center gap-2 ml-auto">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative p-2 hover:bg-white rounded-full transition-colors"
            onClick={() => alert("Notifications coming soon!")}
          >
            <Bell className="w-5 h-5 text-gray-500" />
            {foods.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#eef8ee]" />
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 hover:bg-white rounded-full transition-colors"
            onClick={() => alert("Messages coming soon!")}
          >
            <MessageSquare className="w-5 h-5 text-gray-500" />
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
            onClick={() => setActiveTab("profile")}
          >
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800 leading-tight group-hover:text-[#1a5c2e] transition-colors">
                {userInfo?.name || "Student"}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight">Student Member</p>
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
            <motion.h1 variants={fadeUp} className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight mb-0.5">
              Hello, {userInfo?.name || "Student"}!
            </motion.h1>
            <motion.h2 variants={fadeUp} className="text-3xl lg:text-4xl font-black text-[#1a5c2e] leading-tight mb-4">
              Find freshness around you.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-sm text-gray-500 max-w-sm leading-relaxed">
              Join the{" "}
              <span className="font-bold text-[#1a5c2e]">
                {activeStudents > 0 ? activeStudents.toLocaleString() : "…"} student{activeStudents !== 1 ? "s" : ""}
              </span>{" "}
              reducing waste today. Your next meal is waiting at a nearby collection point.
            </motion.p>
          </motion.div>

          {/* Right: Impact card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="bg-[#c7c2f5] rounded-2xl p-5 flex flex-col justify-between shadow-sm"
          >
            <div>
              <p className="text-[10px] font-bold text-[#6b5ecc] uppercase tracking-widest mb-2">
                My Impact
              </p>
              <div className="flex items-baseline gap-1 mb-1">
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                  className="text-5xl font-black text-[#2d1f8f]"
                >
                  <AnimatedCounter value={userInfo?.points ?? 0} />
                </motion.span>
                <span className="text-lg font-bold text-[#6b5ecc]">pts</span>
              </div>
              <p className="text-xs text-[#6b5ecc] leading-relaxed">
                {(userInfo?.points ?? 0) >= 100
                  ? "You've reached a new tier! 🎉"
                  : "You're just one order away from your first impact badge!"}
              </p>
            </div>
            <div className="mt-4">
              <div className="h-1.5 bg-[#a89fe8] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((userInfo?.points ?? 0) / 100) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
                  className="h-full bg-[#2d1f8f] rounded-full"
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] text-[#8a7fd4] uppercase tracking-wider font-semibold">
                  {userInfo?.points ?? 0}/100 points to next tier
                </p>
                <span className="text-base">🌿</span>
              </div>
            </div>
          </motion.div>
        </div>

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
                    : "bg-white text-gray-600 border border-gray-200 hover:border-[#22c55e]/50 hover:text-gray-800"
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
                    ? "bg-[#eef8ee] text-[#1a5c2e] border-[#1a5c2e]/40" 
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#22c55e]/50 hover:text-gray-800"
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
                    className="absolute left-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-20 min-w-[200px] max-h-60 overflow-y-auto"
                  >
                    {availableLocations.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => { setSelectedLocation(loc); setShowLocationMenu(false); }}
                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors hover:bg-[#eef8ee] ${selectedLocation === loc ? "text-[#22c55e] font-bold" : "text-gray-700"}`}
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
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors bg-white/80 px-3 py-1.5 rounded-full border border-gray-200"
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
                  className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-20 min-w-[160px]"
                >
                  {(Object.entries(sortLabels) as [SortOrder, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setSortOrder(key); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors hover:bg-[#eef8ee] ${sortOrder === key ? "text-[#22c55e] font-bold" : "text-gray-700"}`}
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
            <h3 className="text-xl font-extrabold text-gray-900">All Available Food</h3>
            <p className="text-sm text-gray-400 mt-0.5">
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
        <AnimatePresence mode="wait">
          {filteredFoods.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200"
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
            <motion.div
              key={selectedCategory + searchQuery + sortOrder}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
            >
              {filteredFoods.map((food: any) => (
                <motion.div key={food.id} variants={cardVariants} layout>
                  <FluidFoodCard food={food} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

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
          <div className="min-h-screen flex items-center justify-center bg-[#eef8ee]">
            <div className="w-10 h-10 rounded-full border-4 border-[#1a5c2e] border-t-transparent animate-spin" />
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}
