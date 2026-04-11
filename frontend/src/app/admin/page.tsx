"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/axios";
import { clearAuth, getAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  Utensils,
  ScanLine,
  LogOut,
  TrendingUp,
  AlertTriangle,
  Search,
  Trash2,
  Package,
  HeartHandshake,
  GraduationCap,
  Zap,
  Download,
  Calendar,
  ArrowRight,
  Truck,
  Archive,
  AlertCircle,
  Leaf,
  Shield,
  Lightbulb,
  TrendingDown,
  UploadCloud,
  Hourglass,
  PartyPopper,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Star,
  ShieldAlert,
  Wallet,
  Award,
  ChevronDown,
  Globe,
  RefreshCw,
  ClipboardCheck,
  X,
  CheckCircle2,
  Clock,
  MapPin,
  Ticket,
  Terminal,
  Radio,
  Filter,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { motion, AnimatePresence } from "framer-motion";
import Pusher from "pusher-js";

// ─────────────────────────────────────────────────────────────
// Helper: derive top dining halls from food data
// ─────────────────────────────────────────────────────────────
function getTopHubs(food: any[]) {
  const map: Record<string, { name: string; total: number; reserved: number }> = {};
  food.forEach((f) => {
    const hall = f.dining_hall || f.location || "Unknown";
    if (!map[hall]) map[hall] = { name: hall, total: 0, reserved: 0 };
    map[hall].total += 1;
    map[hall].reserved += f.Reservations?.length || 0;
  });
  return Object.values(map)
    .sort((a, b) => b.reserved - a.reserved)
    .slice(0, 3);
}

// ─────────────────────────────────────────────────────────────
// Helper: export array to CSV
// ─────────────────────────────────────────────────────────────
function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]).filter((k) => k !== "password");
  const header = keys.join(",");
  const rows = data.map((row) =>
    keys
      .map((k) => {
        const val = row[k] ?? "";
        const str = typeof val === "object" ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type ActiveTab = "overview" | "users" | "food" | "analytics" | "logistics" | "godmode" | "logs";
type FoodCategoryView = "categories" | "donors" | "students";
type UserFilter = "all" | "donor" | "student";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [foodCategoryView, setFoodCategoryView] = useState<FoodCategoryView>("categories");
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  const [stats, setStats] = useState({ users: 0, activeFoodCount: 0, activeDonors: 0, activeStudents: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [food, setFood] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Users tab filter/pagination states
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(0);
  const PAGE_SIZE = 10;

  // Logs tab state
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logSearch, setLogSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsPollRef = useRef<NodeJS.Timeout | null>(null);

  // Admin auth info
  const adminUser = getAuth();

  // ── Data Fetching ──────────────────────────────────────────
  useEffect(() => {
    fetchDashboardData();

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    const channel = pusher.subscribe("food-channel");

    channel.bind("food_added", (newFood: any) => {
      setFood((prev) => [newFood, ...prev]);
      setStats((prev) => ({ ...prev, activeFoodCount: prev.activeFoodCount + 1 }));
    });

    channel.bind("food_update", (data: { foodId: number; quantity: number }) => {
      setFood((prev) =>
        prev.map((f) => (f.id === data.foodId ? { ...f, quantity: data.quantity } : f))
      );
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  // Poll logs every 4 seconds when on logs tab
  useEffect(() => {
    const fetchLogs = async () => {
      if (activeTab !== "logs") return;
      try {
        setLogsLoading(true);
        const res = await api.get("/auth/admin/logs");
        setLogs(res.data);
      } catch { /* silent */ } finally {
        setLogsLoading(false);
      }
    };
    fetchLogs();
    logsPollRef.current = setInterval(fetchLogs, 4000);
    return () => { if (logsPollRef.current) clearInterval(logsPollRef.current); };
  }, [activeTab]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const fetchDashboardData = async () => {
    if (!users.length && !food.length) setLoading(true);
    try {
      const [usersRes, foodRes, statsRes, aiRes] = await Promise.all([
        api.get("/auth/users").catch(() => ({ data: [] })),
        api.get("/food/all").catch(() => ({ data: [] })),
        api.get("/food/stats").catch(() => ({ data: { activeCount: 0 } })),
        api.get("/ai/waste-prediction").catch(() => ({ data: null })),
      ]);

      setUsers(usersRes.data);
      setFood(foodRes.data);
      setAnalytics(aiRes.data);

      setStats({
        users: usersRes.data.length,
        activeFoodCount: statsRes.data.activeCount,
        activeDonors: usersRes.data.filter((u: any) => u.role === "donor").length,
        activeStudents: usersRes.data.filter((u: any) => u.role === "student").length,
      });
    } catch (error) {
      console.error("Failed to load admin data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // ── Handlers ──────────────────────────────────────────────
  const handleApplySuggestion = async () => {
    if (!analytics?.suggestionType || analytics.suggestionType === "NONE") return;
    setApplying(true);
    try {
      const res = await api.post("/ai/apply-suggestion", { type: analytics.suggestionType });
      alert(res.data.message);
      fetchDashboardData();
    } catch {
      alert("Failed to apply action.");
    } finally {
      setApplying(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setStats((prev) => {
        const deleted = users.find((u) => u.id === userId);
        return {
          ...prev,
          users: prev.users - 1,
          activeDonors: deleted?.role === "donor" ? prev.activeDonors - 1 : prev.activeDonors,
          activeStudents: deleted?.role === "student" ? prev.activeStudents - 1 : prev.activeStudents,
        };
      });
    } catch {
      alert("Failed to delete user");
    }
  };

  const handleDeleteFood = async (foodId: number) => {
    if (!confirm("Are you sure you want to remove this food listing?")) return;
    try {
      await api.delete(`/food/${foodId}`);
      setFood((prev) => prev.filter((f) => f.id !== foodId));
      setStats((prev) => ({ ...prev, activeFoodCount: prev.activeFoodCount - 1 }));
    } catch {
      alert("Failed to remove food listing");
    }
  };

  // ── Derived data ──────────────────────────────────────────
  const filteredUsers = users
    .filter((u) => u.role !== "admin")
    .filter((u) => (userFilter === "all" ? true : u.role === userFilter))
    .filter((u) =>
      !userSearch
        ? true
        : u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

  const paginatedUsers = filteredUsers.slice(userPage * PAGE_SIZE, (userPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  // Recent reservations (last 3) for Logistics Activity
  const recentReservations = food
    .flatMap((f) =>
      (f.Reservations || []).map((r: any) => ({
        ...r,
        foodName: f.name,
        foodImage: f.image_url,
        diningHall: f.dining_hall,
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Recent user registrations for Manifest Activities
  const recentUsers = [...users]
    .filter((u) => u.role !== "admin")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  // Top dining hubs
  const topHubs = getTopHubs(food);

  // Total reservations across all food
  const totalReservations = food.reduce((acc, f) => acc + (f.Reservations?.length || 0), 0);

  // ── Sidebar Item ──────────────────────────────────────────
  const SidebarItem = ({ id, label, icon: Icon }: { id: string; label: string; icon: any }) => (
    <div className="relative px-3 mb-0.5">
      <AnimatePresence>
        {activeTab === id && (
          <motion.div
            layoutId="admin-sidebar-active-pill"
            className="absolute inset-0 bg-white rounded-xl shadow-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </AnimatePresence>
      <button
        onClick={() => {
          setActiveTab(id as ActiveTab);
          if (id === "food") {
            setFoodCategoryView("categories");
            setSelectedEntity(null);
          }
        }}
        className={`group relative w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors duration-150 rounded-xl z-10 ${
          activeTab === id ? "text-[#1a5c2e] font-semibold" : "text-gray-500 hover:text-gray-800 hover:bg-[#e5f5e9]"
        }`}
      >
        <motion.div whileHover={{ scale: 1.15 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Icon className={`size-4 flex-shrink-0 transition-colors ${activeTab === id ? "text-[#1a5c2e]" : "text-gray-400 group-hover:text-gray-600"}`} />
        </motion.div>
        {label}
      </button>
    </div>
  );

  // ── Status badge helper ───────────────────────────────────
  const reservationStatusBadge = (status: string) => {
    if (status === "picked_up")
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider">Picked Up</Badge>;
    if (status === "cancelled")
      return <Badge variant="destructive" className="bg-red-100 text-red-700 border-none rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider">Cancelled</Badge>;
    return <Badge className="bg-[#E8F3EE] text-[#2A5C3B] dark:bg-[#1a3824] dark:text-[#4ade80] border-none rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider">Reserved</Badge>;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRole="admin">
        <div className="min-h-screen flex items-center justify-center bg-[#F0F5F2] dark:bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full border-4 border-emerald-700/20 border-t-emerald-700 dark:border-emerald-500/20 dark:border-t-emerald-500 animate-spin" />
            <p className="text-sm font-medium text-muted-foreground tracking-wide">Booting command centre…</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRole="admin">
      <div className="flex min-h-screen bg-[#F0F5F2] dark:bg-background text-foreground font-sans selection:bg-emerald-500/30">

        {/* ── SIDEBAR ── */}
        <aside className="w-56 border-r border-[#d4edda] bg-[#eef8ee] flex-col hidden lg:flex fixed top-0 left-0 h-screen z-40">
          <div className="px-5 pt-7 pb-5">
            <BrandLogo
              size={38}
              subtitle="Admin Command"
              titleClassName="text-[1.02rem]"
              wordmarkSize="sm"
            />
          </div>

          <nav className="flex-1 flex flex-col w-full">
            <SidebarItem id="overview"   label="Dashboard"       icon={LayoutDashboard} />
            <SidebarItem id="food"       label="Food Oversight"  icon={HeartHandshake}  />
            <SidebarItem id="users"      label="Partners"        icon={Users}           />
            <SidebarItem id="logistics"  label="Logistics"       icon={Truck}           />
            <SidebarItem id="analytics"  label="Analytics"       icon={TrendingUp}      />
            <div className="mt-4 mb-2 px-6">
              <div className="h-px w-full bg-[#d4edda]" />
            </div>
            <SidebarItem id="logs"       label="Activity Logs"   icon={Terminal}        />
            <SidebarItem id="godmode"    label="God Mode"        icon={Shield}          />
          </nav>

          <div className="px-4 pb-6 mt-auto">
            <motion.button
              onClick={() => { clearAuth(); window.location.href = "/login"; }}
              whileHover={{ scale: 1.02, backgroundColor: "#fee2e2" }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-600 font-semibold text-sm py-2 transition-colors rounded-xl"
            >
              <LogOut className="size-4" /> Log Out
            </motion.button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 lg:ml-56 relative mb-24 lg:mb-0 flex flex-col min-h-screen">
          <header className="flex justify-end items-center gap-3 p-4 sm:px-10 sm:pt-10 w-full z-10">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
              onClick={handleRefresh}
              title="Refresh data"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <ModeToggle />
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
              onClick={() => { clearAuth(); window.location.href = "/login"; }}
            >
              <LogOut className="mr-2 size-4 hidden sm:inline" />
              <span className="hidden sm:inline">Logout</span>
              <LogOut className="size-4 sm:hidden" />
            </Button>
          </header>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-6xl mx-auto p-4 sm:px-10 sm:pb-10 flex-1 mt-2"
          >

            {/* ══════════════════════════════════════════════════════
                OVERVIEW TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === "overview" && (
              <div className="space-y-10 relative">
                <div className="absolute -top-20 -left-20 -z-10 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
                <div className="absolute top-40 -right-20 -z-10 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 z-10 relative">
                  <div>
                    <h2 className="text-5xl font-extrabold tracking-tight text-foreground">Systems Overview</h2>
                    <p className="text-muted-foreground mt-3 text-lg max-w-xl font-medium">
                      The pulse of the campus food ecosystem, visualized in real time.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      className="rounded-full bg-card/60 backdrop-blur-xl border-border/50 text-foreground shadow-sm h-12 px-6 font-medium"
                      onClick={handleRefresh}
                    >
                      <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
                      {refreshing ? "Refreshing…" : "Refresh Data"}
                    </Button>
                    <Button
                      className="rounded-full bg-[#2A5C3B] hover:bg-[#1f452c] text-white border-none shadow-lg shadow-emerald-900/20 h-12 px-6 font-medium"
                      onClick={() => exportToCSV(food, "food_report.csv")}
                    >
                      <Download className="mr-2 size-4" /> Export Report
                    </Button>
                  </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                  {/* Left Column */}
                  <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Total Users Card */}
                      <Card className="p-8 bg-card/90 backdrop-blur-xl border-border/50 rounded-[2rem] shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-10">
                          <div className="p-4 bg-green-500/20 dark:bg-green-500/10 rounded-2xl text-green-600 dark:text-green-400">
                            <Users className="size-6" />
                          </div>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 border-none rounded-full px-3 py-1 text-xs font-bold">Live</Badge>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Total Partners</p>
                          <h3 className="text-5xl font-black text-foreground tracking-tight">{Math.max((stats?.users ?? 0) - 1, 0).toLocaleString()}</h3>
                        </div>
                      </Card>

                      {/* Active Listings Card */}
                      <Card className="p-8 bg-card/90 backdrop-blur-xl border-border/50 rounded-[2rem] shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-10">
                          <div className="p-4 bg-[#E8EFE9] dark:bg-[#2A362D] rounded-2xl text-[#5E7962] dark:text-[#84A98C]">
                            <Package className="size-6" />
                          </div>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 border-none rounded-full px-3 py-1 text-xs font-bold">Live</Badge>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Active Listings</p>
                          <h3 className="text-5xl font-black text-foreground tracking-tight">{stats.activeFoodCount.toLocaleString()}</h3>
                        </div>
                      </Card>
                    </div>

                    {/* AI Alert Card — connected to real analytics */}
                    <Card className="p-10 bg-card/95 backdrop-blur-xl border-border/50 rounded-[2rem] shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
                      <div className="flex-1 space-y-5">
                        <Badge
                          variant="destructive"
                          className={`border-none rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider ${
                            analytics?.analysis === "Low Waste Risk"
                              ? "bg-green-500 hover:bg-green-500"
                              : "bg-[#FF453A] hover:bg-[#FF453A]"
                          } text-white`}
                        >
                          {analytics?.analysis ?? "Loading..."}
                        </Badge>
                        <h3 className="text-3xl font-bold leading-tight">
                          <span className="text-foreground">AI Waste Prediction:</span><br />
                          <span className="text-green-700 dark:text-green-500">
                            {analytics?.details?.split(".")[0] ?? "Analyzing data..."}
                          </span>
                        </h3>
                        <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                          {analytics?.suggestion ?? "System is analyzing current inventory levels."}
                        </p>
                        {analytics?.suggestionType && analytics.suggestionType !== "NONE" && (
                          <div className="pt-2">
                            <Button
                              className="rounded-full bg-[#1C1C1E] dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-300 text-white h-12 px-6 font-semibold shadow-xl shadow-black/10"
                              onClick={handleApplySuggestion}
                              disabled={applying}
                            >
                              {applying ? "Executing…" : "Execute Mitigation"} <Zap className="ml-2 size-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="w-48 h-48 rounded-full border-[12px] border-border/50 border-dashed flex items-center justify-center bg-muted/20 relative">
                        <AlertTriangle className="size-16 text-green-700 dark:text-green-500" />
                        {analytics?.atRiskCount > 0 && (
                          <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-black rounded-full w-8 h-8 flex items-center justify-center border-2 border-background">
                            {analytics.atRiskCount}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Right Column */}
                  <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* AI Analytics — real data */}
                    <Card className="p-8 bg-gradient-to-br from-[#2A5C3B] to-[#1e442a] border-none rounded-[2rem] text-white shadow-xl relative overflow-hidden h-[240px] flex flex-col justify-between">
                      <div className="absolute right-6 top-6 opacity-20">
                        <ScanLine className="size-12" />
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-white/80">
                        <div className="size-2 rounded-full bg-blue-400 animate-ping" /> AI Waste Engine
                      </div>
                      <div>
                        <div className="flex items-end gap-3 mb-2">
                          <h3 className="text-5xl font-black tracking-tighter">
                            {analytics?.lifecycle?.pickedUp ?? 0}
                          </h3>
                          <span className="text-white/60 text-sm mb-2">items rescued</span>
                        </div>
                        <p className="text-white/70 font-medium">
                          {analytics?.environmental?.savedCO2 ?? "0"} kg CO₂ saved to date
                        </p>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none opacity-50">
                        <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-white fill-none stroke-current stroke-[1.5]">
                          <path d="M0 10 Q 15 5, 30 15 T 60 15 T 100 5" />
                        </svg>
                      </div>
                    </Card>

                    {/* Donors & Students */}
                    <div className="grid grid-cols-2 gap-6 flex-1">
                      <Card
                        className="p-6 bg-card/90 backdrop-blur-xl border-border/50 rounded-[2rem] shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 transition-all"
                        onClick={() => { setActiveTab("users"); setUserFilter("donor"); }}
                      >
                        <div className="w-12 h-12 bg-[#E8EFE9] dark:bg-[#2A362D] rounded-2xl flex items-center justify-center text-[#5E7962] dark:text-[#84A98C] mb-6">
                          <HeartHandshake className="size-5" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-foreground mb-1">{stats.activeDonors.toLocaleString()}</h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Donors</p>
                        </div>
                      </Card>

                      <Card
                        className="p-6 bg-card/90 backdrop-blur-xl border-border/50 rounded-[2rem] shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-500/50 transition-all"
                        onClick={() => { setActiveTab("users"); setUserFilter("student"); }}
                      >
                        <div className="w-12 h-12 bg-[#E8EFE9] dark:bg-[#2A362D] rounded-2xl flex items-center justify-center text-[#5E7962] dark:text-[#84A98C] mb-6">
                          <GraduationCap className="size-5" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-foreground mb-1">{stats.activeStudents.toLocaleString()}</h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Students</p>
                        </div>
                      </Card>
                    </div>

                    {/* Total Reservations */}
                    <Card className="p-8 bg-gradient-to-r from-emerald-900/10 to-teal-900/5 backdrop-blur-xl border border-border/50 rounded-[2rem] flex flex-col justify-center gap-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Reservations</p>
                      <div className="flex items-center justify-between">
                        <h3 className="text-3xl font-black">{totalReservations.toLocaleString()}</h3>
                        <div className="flex items-end gap-1 h-8">
                          {[40, 50, 45, 60, 55, 75].map((h, i) => (
                            <div key={i} style={{ height: `${h}%` }} className="w-2 bg-emerald-500/40 rounded-t-sm" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">across {food.length} food listings</p>
                    </Card>
                  </div>
                </div>

                {/* Recent Logistics Activity — REAL DATA */}
                <div className="pt-12">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pt-6 border-t border-border/40">
                    <div>
                      <nav className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2">Systems Oversight</nav>
                      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                        Recent Reservations <span className="text-3xl hidden sm:inline">🎫</span>
                      </h2>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-emerald-700 dark:text-emerald-500 hover:text-emerald-800 dark:hover:text-emerald-400 font-bold mt-4 md:mt-0 group"
                      onClick={() => setActiveTab("logistics")}
                    >
                      View Full Ledger <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {recentReservations.length > 0 ? recentReservations.map((r: any) => (
                      <div key={r.id} className="group bg-card/60 backdrop-blur-xl p-5 rounded-2xl border border-border/50 flex flex-col md:flex-row gap-6 lg:gap-8 items-center transition-all hover:bg-card hover:-translate-y-1 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                        {/* Image Column */}
                        <div className="w-full md:w-56 h-40 shrink-0 rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center relative">
                          {r.foodImage ? (
                            <img src={r.foodImage} alt={r.foodName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <span className="text-5xl text-muted-foreground opacity-50">🍽️</span>
                          )}
                        </div>

                        {/* Details Grid */}
                        <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full text-left">
                          {/* Title & Code */}
                          <div className="col-span-1 lg:col-span-1">
                            <h3 className="text-xl font-bold text-foreground mb-1 leading-tight">{r.foodName}</h3>
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-500 font-bold text-xs mt-3">
                              <Ticket className="w-4 h-4" />
                              <span className="tracking-widest uppercase">{r.reservation_code}</span>
                            </div>
                          </div>

                          {/* Inventory / Location */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Package className="w-5 h-5 opacity-70" />
                              <span className="text-sm font-medium">Quantity: <span className="text-foreground">{r.quantity} Unit{r.quantity !== 1 && "s"}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-5 h-5 opacity-70" />
                              <span className="text-sm font-medium truncate">{r.diningHall || "Unknown Hub"}</span>
                            </div>
                          </div>

                          {/* Time & Schedule */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-5 h-5 opacity-70" />
                              <span className="text-sm font-medium">{new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-5 h-5 opacity-70" />
                              <span className="text-sm font-medium">{new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>

                          {/* Status Badge & Actions */}
                          <div className="flex flex-col items-start lg:items-end justify-center">
                            <div className="mb-4">
                              {reservationStatusBadge(r.status)}
                            </div>
                            <div className="w-16 h-16 bg-card rounded-lg p-1.5 border border-border/50 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                              <ScanLine className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="group bg-card/30 p-5 rounded-2xl border border-dashed border-border flex flex-col md:flex-row gap-8 items-center opacity-70">
                        <div className="w-full md:w-56 h-40 shrink-0 rounded-xl bg-muted/50 flex items-center justify-center">
                          <Package className="w-10 h-10 text-muted-foreground opacity-50" />
                        </div>
                        <div className="flex-grow flex flex-col justify-center text-center md:text-left">
                          <h3 className="text-xl font-bold text-muted-foreground">No recent reservations</h3>
                          <p className="text-sm text-muted-foreground/70 mt-2">Activity will appear here once food is reserved by partners or students across the campus.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer link for scale */}
                  {recentReservations.length > 0 && (
                    <div className="mt-10 flex flex-col items-center gap-4">
                      <Button variant="outline" className="rounded-full px-8 font-bold border-emerald-700/30 text-emerald-700 hover:bg-emerald-700 hover:text-white transition-all">
                        Load Previous Reservations
                      </Button>
                      <p className="text-xs text-muted-foreground font-medium">Displaying recent {recentReservations.length} activities</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                USERS TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === "users" && (
              <div className="space-y-8 pb-20 font-body">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10 mb-2">
                  <div className="max-w-xl">
                    <h2 className="text-4xl font-extrabold tracking-tight text-foreground mb-3">User Management</h2>
                    <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                      Oversee all donors and students. Monitor engagements, points, and account vitality.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="secondary"
                      className="bg-muted hover:bg-accent font-bold rounded-full h-11 px-6 shadow-sm border-none"
                      onClick={() => exportToCSV(filteredUsers, "users_ledger.csv")}
                    >
                      <Download className="mr-2 size-4" /> Export Ledger
                    </Button>
                    <Button
                      className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-full h-11 px-6 shadow-lg border-none"
                      onClick={() => window.open("/login", "_blank")}
                    >
                      <UserPlus className="mr-2 size-4" /> Provision User
                    </Button>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-8 bg-card border-none rounded-3xl shadow-sm flex flex-col justify-between min-h-[180px]">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Partners</p>
                    <h3 className="text-5xl font-black text-emerald-700 dark:text-emerald-400 mb-4">{Math.max((stats.users ?? 0) - 1, 0)}</h3>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      Registered donors and students across the platform.
                    </p>
                  </Card>

                  <Card className="p-8 bg-card border-none rounded-3xl shadow-sm flex flex-col justify-between min-h-[180px] text-center items-center justify-center">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                      <Users className="size-32" />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Total Donors</p>
                    <h3 className="text-5xl font-black text-foreground mb-4">{stats.activeDonors}</h3>
                    <div className="flex items-center text-emerald-700 dark:text-emerald-400 text-[10px] font-bold tracking-widest uppercase">
                      <TrendingUp className="size-3 mr-1" /> Active
                    </div>
                  </Card>

                  <Card className="p-8 bg-emerald-800 border-none rounded-3xl shadow-lg min-h-[180px] relative overflow-hidden flex flex-col justify-between text-white">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                      <Globe className="size-32" />
                    </div>
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2 relative z-10">Total Students</p>
                    <h3 className="text-5xl font-black mb-4 relative z-10 leading-none text-white">
                      {stats.activeStudents}<br />
                      <span className="text-2xl font-bold opacity-90">enrolled</span>
                    </h3>
                    <div className="w-full h-1.5 bg-black/20 rounded-full relative z-10 overflow-hidden">
                      <div className="h-full bg-white/40 rounded-full" style={{ width: `${Math.min((stats.activeStudents / Math.max(stats.users, 1)) * 100, 100)}%` }} />
                    </div>
                  </Card>
                </div>

                {/* Search + Filter Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-transparent pt-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email…"
                        value={userSearch}
                        onChange={(e) => { setUserSearch(e.target.value); setUserPage(0); }}
                        className="pl-9 h-10 w-full sm:w-64 rounded-full bg-card border-border/50"
                      />
                    </div>
                    <div className="flex p-1 bg-muted/50 rounded-full shadow-sm">
                      {(["all", "donor", "student"] as UserFilter[]).map((f) => (
                        <Button
                          key={f}
                          variant="ghost"
                          size="sm"
                          className={`rounded-full px-5 text-sm font-bold transition-colors ${
                            userFilter === f
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                          }`}
                          onClick={() => { setUserFilter(f); setUserPage(0); }}
                        >
                          {f === "all" ? "All Users" : f === "donor" ? "Donors" : "Students"}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                    Showing {filteredUsers.length > 0 ? userPage * PAGE_SIZE + 1 : 0}–{Math.min((userPage + 1) * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length}
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-full border-none bg-card shadow-sm text-muted-foreground hover:bg-accent disabled:opacity-40"
                        onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                        disabled={userPage === 0}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-full border-none bg-card shadow-sm text-muted-foreground hover:bg-accent disabled:opacity-40"
                        onClick={() => setUserPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={userPage >= totalPages - 1}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Data Table */}
                <Card className="rounded-[2rem] bg-card shadow-sm overflow-hidden border-none">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-border/50 text-[9px] uppercase tracking-widest text-muted-foreground font-black">
                          <th className="py-6 px-8 font-black">Identity</th>
                          <th className="py-6 px-4 font-black">Role</th>
                          <th className="py-6 px-4 font-black">Points</th>
                          <th className="py-6 px-4 font-black">Enrolled Since</th>
                          <th className="py-6 px-8 font-black text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {paginatedUsers.length > 0 ? paginatedUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                            <td className="py-5 px-8">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email)}&background=random&color=fff&size=100`}
                                    alt="Avatar"
                                    className="w-12 h-12 rounded-2xl object-cover shadow-sm bg-muted"
                                  />
                                  <div className={`absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-card flex items-center justify-center ${u.role === "donor" ? "bg-emerald-700 text-white" : "bg-blue-600 text-white"}`}>
                                    {u.role === "donor" ? <HeartHandshake className="size-2.5" /> : <GraduationCap className="size-2.5" />}
                                  </div>
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-foreground">{u.name || "Anonymous User"}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                                  {u.college && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{u.college}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-4 align-middle">
                              <Badge
                                variant="secondary"
                                className={`${u.role === "donor" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"} border-none rounded-md px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase`}
                              >
                                {u.role}
                              </Badge>
                            </td>
                            <td className="py-5 px-4 align-middle">
                              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                                <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                                {u.points ? u.points.toLocaleString() : "0"}
                                <span className="text-xs font-semibold text-muted-foreground">pts</span>
                              </div>
                            </td>
                            <td className="py-5 px-4 align-middle">
                              <p className="text-sm font-semibold text-foreground">
                                {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                              <p className="text-[10px] font-medium text-muted-foreground capitalize">{u.role} account</p>
                            </td>
                            <td className="py-5 px-8 align-middle text-right opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl size-8 transition-colors"
                                onClick={() => handleDeleteUser(u.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm font-medium">
                              {userSearch ? `No users matching "${userSearch}"` : "No users registered yet."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Load more if more pages */}
                  {totalPages > 1 && (
                    <div className="w-full border-t border-border/30 py-4 flex justify-center bg-muted/10">
                      <p className="text-xs text-muted-foreground font-medium">
                        Page {userPage + 1} of {totalPages} · {filteredUsers.length} total
                      </p>
                    </div>
                  )}
                </Card>

                {/* Bottom Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Security Ledger */}
                  <Card className="p-8 bg-emerald-800 border-none rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[280px]">
                    <div className="absolute -bottom-8 -right-8 opacity-10 pointer-events-none text-white">
                      <Shield className="size-64" strokeWidth={0.5} />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Security Ledger</h3>
                      <p className="text-white/80 leading-relaxed text-sm font-medium pr-4">
                        {stats.users} total accounts monitored. {stats.activeDonors} donors and {stats.activeStudents} students currently active.
                      </p>
                    </div>
                    <Button
                      className="bg-white text-emerald-800 hover:bg-white/90 rounded-full h-12 font-bold shadow-xl mt-8 relative z-10 px-6 transition-colors"
                      onClick={() => exportToCSV(users, "security_audit.csv")}
                    >
                      <Download className="mr-2 size-4" /> Audit Export
                    </Button>
                  </Card>

                  {/* Recent Manifest Activities — REAL DATA */}
                  <Card className="md:col-span-2 p-8 bg-card border-none rounded-3xl shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-bold tracking-tight text-foreground">Recent Registrations</h3>
                      <Button variant="link" className="text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest px-0" onClick={() => setUserFilter("all")}>
                        View All
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {recentUsers.length > 0 ? recentUsers.map((u) => (
                        <div key={u.id} className="flex items-start gap-4">
                          <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${u.role === "donor" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                            {u.role === "donor"
                              ? <HeartHandshake className="size-4 text-emerald-700 dark:text-emerald-400" />
                              : <GraduationCap className="size-4 text-blue-700 dark:text-blue-400" />
                            }
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-sm text-foreground">{u.name || "Anonymous"} <span className="font-normal text-muted-foreground">joined as {u.role}</span></h4>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{u.email}</p>
                            <p className="text-[10px] font-bold text-muted-foreground/60 mt-2 uppercase tracking-wide">
                              {new Date(u.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">No recent registrations.</div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                FOOD OVERSIGHT TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === "food" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[28px] font-bold text-foreground tracking-tight">Food Oversight</h2>
                  {foodCategoryView !== "categories" && (
                    <Button variant="outline" className="font-bold text-sm px-4 h-9 rounded-xl shadow-sm" onClick={() => {
                      if (selectedEntity) setSelectedEntity(null);
                      else setFoodCategoryView("categories");
                    }}>
                      ← {selectedEntity ? "Back to List" : "Back to Categories"}
                    </Button>
                  )}
                </div>

                {foodCategoryView === "categories" && !selectedEntity && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <Card className="p-8 cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group relative overflow-hidden" onClick={() => setFoodCategoryView("donors")}>
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Utensils className="size-24" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2 group-hover:text-purple-400 relative z-10 text-foreground transition-colors">Food Posted by Donors</h3>
                      <p className="text-muted-foreground relative z-10">View all food listings posted, including active and claimed items.</p>
                      <div className="mt-4 text-4xl font-black text-foreground/10 group-hover:text-purple-500/20 transition-colors relative z-10">{food.length} total listings</div>
                    </Card>

                    <Card className="p-8 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group relative overflow-hidden" onClick={() => setFoodCategoryView("students")}>
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="size-24" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-400 relative z-10 text-foreground transition-colors">Orders Made by Students</h3>
                      <p className="text-muted-foreground relative z-10">View all student reservations, claims, and pickup histories.</p>
                      <div className="mt-4 text-4xl font-black text-foreground/10 group-hover:text-blue-500/20 transition-colors relative z-10">
                        {totalReservations} total orders
                      </div>
                    </Card>
                  </div>
                )}

                {foodCategoryView === "donors" && (() => {
                  const foodsByDonor = food.reduce((acc: any, f: any) => {
                    const donorKey = f.donor?.email || "Unknown Donor";
                    const donorName = f.donor?.name || "Unknown Donor";
                    if (!acc[donorKey]) acc[donorKey] = { name: donorName, email: donorKey, foods: [] };
                    acc[donorKey].foods.push(f);
                    return acc;
                  }, {});
                  const donorGroups = Object.values(foodsByDonor) as any[];

                  if (!selectedEntity) {
                    return donorGroups.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {donorGroups.map((group: any) => (
                          <Card key={group.email} className="p-6 cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group" onClick={() => setSelectedEntity(group.email)}>
                            <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 flex items-center gap-2">
                              <Users size={18} /> {group.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{group.email}</p>
                            <div className="mt-4 text-3xl font-black text-foreground/10 group-hover:text-purple-500/20 transition-colors">{group.foods.length} postings</div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground mt-10">No food postings found.</div>
                    );
                  }

                  const selectedGroup: any = donorGroups.find((g: any) => g.email === selectedEntity);
                  if (!selectedGroup) return null;

                  return (
                    <div className="bg-[#fcfdfc] p-6 sm:p-8 rounded-[2rem] shadow-sm mt-6 border border-border/40">
                      <div className="flex justify-between items-end mb-8 border-b border-border/40 pb-6">
                        <div>
                          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-foreground">
                            Live Inventory
                          </h2>
                          <p className="text-xs font-bold text-gray-500 mt-2 uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-4 h-4" /> {selectedGroup.name} <span className="opacity-50">•</span> {selectedGroup.foods.length} ACTIVE ITEMS
                          </p>
                        </div>
                        <div className="hidden sm:flex gap-6">
                          <span className="font-bold text-sm text-[#1a5c2e] border-b-[3px] border-[#1a5c2e] pb-1.5 cursor-pointer">All Items</span>
                          <span className="font-bold text-sm text-gray-400 hover:text-gray-600 pb-1.5 cursor-pointer">Perishables</span>
                          <span className="font-bold text-sm text-gray-400 hover:text-gray-600 pb-1.5 cursor-pointer">Canned Goods</span>
                        </div>
                      </div>
                  
                      <div className="space-y-8">
                        {selectedGroup.foods.map((f: any, index: number) => {
                          const isExpired = new Date(f.expiry_time) < new Date();
                          const isAvailable = f.quantity > 0;
                          const expiryDate = new Date(f.expiry_time);
                          const postedDate = new Date(f.createdAt || Date.now());
                          const hoursUntilExpiry = Math.max(0, Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60)));
                          const daysUntilExpiry = Math.floor(hoursUntilExpiry / 24);
                          
                          // Dynamic coloring based on index/type to match screenshot diversity
                          const catColor = index % 2 === 0 ? "bg-[#1a5c2e]" : "bg-[#c44919]";
                          
                          return (
                            <div key={f.id} className="bg-white dark:bg-card rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-border/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                              {/* Left Image Section */}
                              <div className="w-full md:w-[40%] h-64 md:h-auto relative bg-black shrink-0">
                                {f.image_url ? (
                                  <img src={f.image_url} alt={f.name} className="w-full h-full object-cover opacity-90" />
                                ) : (
                                  <div className="w-full h-full bg-slate-900 flex items-center justify-center opacity-80">
                                    <span className="text-7xl">🍽️</span>
                                  </div>
                                )}
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90 pointer-events-none" />
                                
                                <div className="absolute bottom-6 left-6 right-6">
                                  <Badge className={`${catColor} hover:${catColor} text-white tracking-[0.15em] text-[9px] uppercase font-black px-2.5 py-1 mb-3 rounded-md`}>
                                    CATEGORY: {f.allergens && f.allergens.length > 0 ? f.allergens[0] : "PRODUCE"}
                                  </Badge>
                                  <div className="flex items-center text-white/90 font-medium text-xs tracking-wide">
                                    <MapPin className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                    {f.dining_hall}
                                  </div>
                                </div>
                              </div>
                  
                              {/* Right Info Section */}
                              <div className="p-8 w-full flex flex-col justify-between">
                                {/* Top Row: Title and Status */}
                                <div className="flex justify-between items-start mb-8 gap-4">
                                  <div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-1.5 leading-tight">{f.name}</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">SKU: #{String(f.id).substring(0, 8).toUpperCase()}</p>
                                  </div>
                                  <div className="text-right flex items-start gap-4">
                                    {isExpired ? (
                                      <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 text-[10px] uppercase font-black tracking-widest border-none mt-2 shadow-sm">Expired</Badge>
                                    ) : isAvailable ? (
                                      <Badge className="bg-[#eaf4ec] text-[#1a5c2e] hover:bg-[#d8ebd9] text-[10px] uppercase font-black tracking-widest border-none mt-2 shadow-sm rounded-md px-3 py-1">Active</Badge>
                                    ) : (
                                      <Badge className="bg-gray-100 text-gray-600 text-[10px] uppercase font-black tracking-widest border-none mt-2 shadow-sm">Claimed</Badge>
                                    )}
                                    <div className="text-right">
                                      <div className="flex items-baseline justify-end gap-1.5">
                                        <span className="text-4xl font-black text-gray-900 dark:text-foreground tracking-tighter leading-none">{f.quantity}</span>
                                        <span className="text-sm font-semibold text-gray-500">kg</span>
                                      </div>
                                      <p className={`text-[10px] font-black uppercase tracking-widest mt-1.5 text-right ${hoursUntilExpiry < 48 ? 'text-[#c44919]' : 'text-[#1a5c2e]'}`}>
                                        {hoursUntilExpiry < 48 ? 'Short Dated' : 'In Stock'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                  
                                {/* Middle Row: Grid Info */}
                                <div className="grid grid-cols-2 gap-6 mb-10">
                                  <div className="flex gap-4 items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-muted flex items-center justify-center shrink-0 border border-slate-100 dark:border-border/50">
                                      <Calendar className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">HARVEST DATE</span>
                                      <span className="text-sm font-bold text-gray-900 dark:text-foreground">{postedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-4 items-center">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${isExpired ? 'bg-red-50 border-red-100' : hoursUntilExpiry < 48 ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 dark:bg-muted border-slate-100 dark:border-border/50'}`}>
                                      {isExpired ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Clock className={`w-5 h-5 ${hoursUntilExpiry < 48 ? 'text-[#c44919]' : 'text-slate-500'}`} />}
                                    </div>
                                    <div className="flex flex-col justify-center">
                                      <span className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isExpired || hoursUntilExpiry < 48 ? 'text-[#c44919]' : 'text-gray-400'}`}>
                                        {isExpired ? 'EXPIRED' : hoursUntilExpiry < 48 ? 'EXPIRY WINDOW' : 'EXPIRING IN'}
                                      </span>
                                      <span className={`text-sm font-bold ${isExpired || hoursUntilExpiry < 48 ? 'text-[#c44919]' : 'text-gray-900 dark:text-foreground'}`}>
                                        {isExpired ? 'Already Expired' : daysUntilExpiry > 0 ? `${daysUntilExpiry} Days` : `${hoursUntilExpiry} Hours`}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                  
                                {/* Bottom Row: Actions */}
                                <div className="flex items-center justify-between mt-auto">
                                  <div className="flex -space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 border-[3px] border-white dark:border-card flex items-center justify-center text-xs font-bold text-blue-700 shadow-sm z-20 overflow-hidden">
                                      <img src="https://i.pravatar.cc/100?img=11" alt="Avatar" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-purple-100 border-[3px] border-white dark:border-card flex items-center justify-center text-xs font-bold text-purple-700 shadow-sm z-10 overflow-hidden">
                                      <img src="https://i.pravatar.cc/100?img=60" alt="Avatar" className="w-full h-full object-cover" />
                                    </div>
                                    {f.Reservations?.length > 0 && (
                                      <div className="w-10 h-10 rounded-full bg-[#1a5c2e] border-[3px] border-white dark:border-card flex items-center justify-center text-xs font-bold text-white tracking-tighter shadow-sm z-0">
                                        +{f.Reservations.length}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex gap-4 items-center">
                                    <span className="text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors" onClick={() => handleDeleteFood(f.id)}>
                                      Remove Entry
                                    </span>
                                    <Button className="bg-[#1a5c2e] hover:bg-[#154d25] text-white rounded-xl px-7 h-11 font-bold shadow-lg shadow-green-900/20 text-sm">
                                      Route Resource
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {foodCategoryView === "students" && (() => {
                  const allReservations = food.flatMap((f) =>
                    (f.Reservations || []).map((r: any) => ({ ...r, foodName: f.name }))
                  );
                  const resByStudent = allReservations.reduce((acc: any, r: any) => {
                    const studentKey = r.User?.email || "Unknown Student";
                    const studentName = r.User?.name || "Unknown Student";
                    if (!acc[studentKey]) acc[studentKey] = { name: studentName, email: studentKey, reservations: [] };
                    acc[studentKey].reservations.push(r);
                    return acc;
                  }, {});
                  const studentGroups = Object.values(resByStudent) as any[];

                  if (!selectedEntity) {
                    return studentGroups.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {studentGroups.map((group: any) => (
                          <Card key={group.email} className="p-6 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group" onClick={() => setSelectedEntity(group.email)}>
                            <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 flex items-center gap-2">
                              <Users size={18} /> {group.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{group.email}</p>
                            <div className="mt-4 text-3xl font-black text-foreground/10 group-hover:text-blue-500/20 transition-colors">{group.reservations.length} orders</div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">No student reservations yet.</div>
                    );
                  }

                  const selectedGroup: any = studentGroups.find((g: any) => g.email === selectedEntity);
                  if (!selectedGroup) return null;

                  return (
                    <div className="bg-card/30 p-6 rounded-2xl border border-border">
                      <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <span className="bg-blue-500/20 text-blue-400 p-2 rounded-lg"><Users size={24} /></span>
                        {selectedGroup.name}
                        <span className="text-sm font-normal text-muted-foreground ml-2">({selectedGroup.email})</span>
                        <Badge variant="outline" className="ml-2">{selectedGroup.reservations.length} orders</Badge>
                      </h3>
                      <div className="rounded-2xl border border-border overflow-x-auto bg-card">
                        <table className="w-full text-left min-w-[600px]">
                          <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                            <tr>
                              <th className="p-4">Food Claimed</th>
                              <th className="p-4">Quantity</th>
                              <th className="p-4">Status & Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {selectedGroup.reservations
                              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .map((r: any) => (
                                <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                                  <td className="p-4 text-foreground font-medium">{r.foodName}</td>
                                  <td className="p-4 font-mono text-muted-foreground">{r.quantity}</td>
                                  <td className="p-4">
                                    <div className="text-sm font-medium capitalize mb-1">{r.status.replace("_", " ")}</div>
                                    <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                LOGISTICS TAB — real reservation ledger
            ══════════════════════════════════════════════════════ */}
            {activeTab === "logistics" && (
              <div className="space-y-8 pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">Logistics Ledger</h2>
                    <p className="text-muted-foreground font-medium">All reservation & pickup activity across the campus network.</p>
                  </div>
                  <Button
                    className="rounded-full bg-emerald-800 hover:bg-emerald-900 text-white border-none h-11 px-6 font-bold"
                    onClick={() => {
                      const reservationData = food.flatMap((f) =>
                        (f.Reservations || []).map((r: any) => ({
                          food: f.name,
                          dining_hall: f.dining_hall,
                          student_name: r.User?.name,
                          student_email: r.User?.email,
                          quantity: r.quantity,
                          status: r.status,
                          code: r.reservation_code,
                          date: r.createdAt,
                        }))
                      );
                      exportToCSV(reservationData, "logistics_ledger.csv");
                    }}
                  >
                    <Download className="mr-2 size-4" /> Export Ledger
                  </Button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Reservations", value: totalReservations, icon: ClipboardCheck, color: "text-blue-600" },
                    { label: "Picked Up", value: food.flatMap((f) => f.Reservations || []).filter((r: any) => r.status === "picked_up").length, icon: CheckCircle2, color: "text-green-600" },
                    { label: "Pending", value: food.flatMap((f) => f.Reservations || []).filter((r: any) => r.status === "reserved").length, icon: Clock, color: "text-yellow-600" },
                    { label: "Active Listings", value: stats.activeFoodCount, icon: Package, color: "text-emerald-600" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="p-6 rounded-2xl bg-card border-none shadow-sm">
                      <Icon className={`size-5 ${color} mb-3`} />
                      <p className="text-2xl font-black text-foreground">{value}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
                    </Card>
                  ))}
                </div>

                {/* Full Reservation Ledger */}
                <Card className="rounded-[2rem] bg-card shadow-sm overflow-hidden border-none">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="border-b border-border/50 text-[9px] uppercase tracking-widest text-muted-foreground font-black">
                          <th className="py-5 px-6 font-black">Food Item</th>
                          <th className="py-5 px-4 font-black">Location</th>
                          <th className="py-5 px-4 font-black">Student</th>
                          <th className="py-5 px-4 font-black">Qty</th>
                          <th className="py-5 px-4 font-black">Status</th>
                          <th className="py-5 px-4 font-black">Code</th>
                          <th className="py-5 px-6 font-black">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {food.flatMap((f) =>
                          (f.Reservations || []).map((r: any) => ({ ...r, foodName: f.name, diningHall: f.dining_hall }))
                        )
                          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((r: any) => (
                            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-4 px-6 font-semibold text-foreground">{r.foodName}</td>
                              <td className="py-4 px-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1"><MapPin className="size-3" /> {r.diningHall || "N/A"}</div>
                              </td>
                              <td className="py-4 px-4 text-sm text-foreground">{r.User?.name || "—"}</td>
                              <td className="py-4 px-4 text-sm font-mono text-muted-foreground">{r.quantity}</td>
                              <td className="py-4 px-4">{reservationStatusBadge(r.status)}</td>
                              <td className="py-4 px-4 font-mono text-xs text-muted-foreground">{r.reservation_code}</td>
                              <td className="py-4 px-6 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        {totalReservations === 0 && (
                          <tr>
                            <td colSpan={7} className="py-16 text-center text-muted-foreground">
                              <Archive className="size-10 mx-auto mb-3 opacity-40" />
                              <p className="font-medium">No reservation records yet.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                ANALYTICS TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === "analytics" && (
              <div className="space-y-8 relative pb-20">
                <div className="mb-8">
                  <h2 className="text-4xl font-black tracking-tight text-foreground mb-2">AI Analytics & Predictions</h2>
                  <p className="text-muted-foreground text-lg">Real-time supply chain intelligence powered by the waste prediction engine.</p>
                </div>

                {analytics ? (
                  <div className="space-y-6">
                    {/* Top Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-2 p-8 bg-card border-border/50 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex-1 space-y-6">
                          <Badge className="bg-[#E8F3EE] hover:bg-[#E8F3EE] text-[#2A5C3B] dark:bg-[#1a3824] dark:text-[#4ade80] border-none rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider flex w-fit items-center gap-2">
                            <div className="size-1.5 rounded-full bg-[#4ade80]" /> Live Engine
                          </Badge>
                          <h3 className="text-3xl font-bold">AI Waste Risk Assessment</h3>
                          <p className="text-muted-foreground text-base leading-relaxed max-w-lg">
                            {analytics.details}
                          </p>
                          <div className="flex gap-4 pt-2">
                            <div className="bg-muted/50 rounded-xl px-4 py-2 border border-border/50">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Risk Level</p>
                              <p className="text-lg font-bold text-green-700 dark:text-green-500">{analytics.analysis}</p>
                            </div>
                            <div className="bg-muted/50 rounded-xl px-4 py-2 border border-border/50">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">At Risk Items</p>
                              <p className="text-lg font-bold text-foreground">{analytics.atRiskCount ?? 0}</p>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 relative flex items-center justify-center w-48 h-48">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[#E8F3EE] dark:text-[#1a3824]" />
                            <circle
                              cx="50" cy="50" r="40"
                              stroke="currentColor" strokeWidth="8" fill="transparent"
                              strokeDasharray="251.2"
                              strokeDashoffset={251.2 - (251.2 * Math.min(analytics.lifecycle?.pickedUp / Math.max(analytics.lifecycle?.totalPosted, 1), 1))}
                              className="text-[#2A5C3B] dark:text-emerald-500"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <p className="text-2xl font-black text-foreground">
                              {analytics.lifecycle?.totalPosted > 0
                                ? Math.round((analytics.lifecycle.pickedUp / analytics.lifecycle.totalPosted) * 100)
                                : 0}%
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rescue Rate</p>
                          </div>
                        </div>
                      </Card>

                      {/* Optimization Suggestion */}
                      <Card className="p-8 bg-gradient-to-br from-[#E8F3EE] to-[#d1e8dc] dark:from-[#1a3824] dark:to-[#112a19] border-none rounded-3xl shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="size-10 bg-[#cae6d6] dark:bg-[#204a2d] rounded-full flex items-center justify-center text-[#2A5C3B] dark:text-[#4ade80] mb-6">
                            <Lightbulb className="size-5 fill-[#2A5C3B] dark:fill-[#4ade80]" />
                          </div>
                          <h3 className="text-2xl font-bold text-foreground mb-4">AI Suggestion</h3>
                          <p className="text-sm text-foreground/80 dark:text-muted-foreground leading-relaxed mb-8">
                            {analytics.suggestion}
                          </p>
                        </div>
                        <Button
                          className="w-full rounded-2xl bg-[#2A5C3B] hover:bg-[#1a4026] text-white font-bold h-12 shadow-md"
                          onClick={handleApplySuggestion}
                          disabled={!analytics.suggestionType || analytics.suggestionType === "NONE" || applying}
                        >
                          {applying ? "Applying…" : analytics.suggestionType === "NONE" ? "No Action Needed" : "Apply Suggestion"}{" "}
                          <ArrowRight className="ml-2 size-4" />
                        </Button>
                      </Card>
                    </div>

                    {/* Middle Row: 3 metric cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="p-6 bg-card border-border/50 rounded-3xl shadow-sm">
                        <div className="flex justify-between items-center mb-5">
                          <div className="text-[#2A5C3B] dark:text-emerald-500 font-black flex items-center gap-0.5 tracking-tighter">CO<sub className="text-[10px]">2</sub></div>
                          <div className="text-green-600 dark:text-green-500 text-xs font-bold flex items-center">Saved <TrendingUp className="size-3 ml-1" /></div>
                        </div>
                        <h3 className="text-4xl font-black mb-1">{analytics.environmental?.savedCO2 ?? "0"} <span className="text-sm font-medium text-muted-foreground">kg</span></h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">CO₂ Saved</p>
                        <div className="flex items-end gap-1.5 h-6">
                          {[40, 50, 45, 60, 55, 75].map((h, i) => (
                            <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-[#2A5C3B]/30 dark:bg-emerald-500/30 rounded-t-sm" />
                          ))}
                        </div>
                      </Card>

                      <Card className="p-6 bg-card border-border/50 rounded-3xl shadow-sm">
                        <div className="flex justify-between items-center mb-5">
                          <Leaf className="size-5 text-[#2A5C3B] dark:text-emerald-500" />
                          <div className="text-green-600 dark:text-green-500 text-xs font-bold flex items-center">Equivalent <TrendingUp className="size-3 ml-1" /></div>
                        </div>
                        <h3 className="text-4xl font-black mb-1">{analytics.environmental?.treesPlanted ?? "0"} <span className="text-sm font-medium text-muted-foreground">trees</span></h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Tree Equivalent</p>
                        <div className="flex items-end gap-1.5 h-6">
                          {[30, 45, 55, 65, 80, 85].map((h, i) => (
                            <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-[#2A5C3B]/30 dark:bg-emerald-500/30 rounded-t-sm" />
                          ))}
                        </div>
                      </Card>

                      <Card className="p-6 bg-card border-border/50 rounded-3xl shadow-sm">
                        <div className="flex justify-between items-center mb-5">
                          <Trash2 className="size-5 text-red-500" />
                          <div className="text-red-500 text-xs font-bold flex items-center">Risk <TrendingDown className="size-3 ml-1" /></div>
                        </div>
                        <h3 className="text-4xl font-black mb-1">{analytics.environmental?.potentialWasteCO2 ?? "0"} <span className="text-sm font-medium text-muted-foreground">kg</span></h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Potential Waste CO₂</p>
                        <div className="flex items-end gap-1.5 h-6">
                          {[80, 70, 60, 50, 40, 40].map((h, i) => (
                            <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-red-500/30 rounded-t-sm" />
                          ))}
                        </div>
                      </Card>
                    </div>

                    {/* Food Lifecycle */}
                    <Card className="p-8 pb-10 bg-card border-border/50 rounded-3xl shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-16 border-b border-border/50 pb-6 gap-4">
                        <div>
                          <h3 className="text-2xl font-bold tracking-tight mb-1">Food Lifecycle & Waste Analysis</h3>
                          <p className="text-muted-foreground text-sm">Real-time flow of inventory across the platform.</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute top-[30px] left-8 right-8 h-[2px] bg-border z-0" />
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative z-10 w-full px-4">
                          {[
                            { icon: UploadCloud, value: analytics.lifecycle?.totalPosted ?? 0, label: "Total Posted", bg: "border-[#cae6d6] dark:border-[#204a2d]" },
                            { icon: Hourglass, value: analytics.lifecycle?.currentAvailable ?? 0, label: "Current Active", bg: "border-[#cae6d6] dark:border-[#204a2d]" },
                            { icon: PartyPopper, value: analytics.lifecycle?.pickedUp ?? 0, label: "Successfully Rescued", bg: "bg-[#386641] dark:bg-[#204a2d] border-none", filled: true },
                            { icon: Trash2, value: analytics.lifecycle?.expiredWaste ?? 0, label: "Unclaimed/Waste", bg: "border-dashed border-border" },
                          ].map(({ icon: Icon, value, label, bg, filled }) => (
                            <div key={label} className="flex flex-col items-center text-center">
                              <div className={`size-[60px] rounded-full border-[3px] ${bg} flex items-center justify-center mb-4 shadow-sm z-10 ${filled ? "text-white" : "text-[#2A5C3B] dark:text-[#4ade80] bg-white dark:bg-zinc-950"}`}>
                                <Icon className="size-5" strokeWidth={2.5} />
                              </div>
                              <p className="text-2xl font-black mb-1 text-foreground">{value}</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest line-clamp-1 mb-2">{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>

                    {/* Top Performing Hubs — REAL DATA */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="md:col-span-2 p-8 bg-[#E8F3EE]/50 dark:bg-zinc-950/50 border-border/50 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10 pointer-events-none" />
                        <div className="relative z-20 max-w-sm">
                          <Badge variant="secondary" className="bg-[#cae6d6] dark:bg-[#1a3824] text-[#2A5C3B] dark:text-[#4ade80] border-none rounded-full px-3 py-0.5 text-[9px] font-black uppercase tracking-widest w-fit mb-6">Live Data</Badge>
                          <h3 className="text-4xl font-black leading-tight mb-4 text-foreground tracking-tight">Distribution<br />Efficiency Map</h3>
                          <p className="text-sm text-foreground/80 dark:text-muted-foreground leading-relaxed mb-6 font-medium">
                            Visualization of dining hall performance and food rescue activity across campus.
                          </p>
                        </div>
                        <div className="relative z-20 flex gap-10">
                          <div>
                            <p className="text-3xl font-black text-foreground">{food.length}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Listings</p>
                          </div>
                          <div>
                            <p className="text-3xl font-black text-foreground">{totalReservations}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">All Reservations</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-8 pb-6 bg-card border-border/50 rounded-3xl shadow-sm flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Top Dining Halls</p>
                          <div className="space-y-5">
                            {topHubs.length > 0 ? topHubs.map((hub, idx) => (
                              <div key={hub.name} className="flex items-center gap-4 group">
                                <div className="size-10 rounded-xl bg-[#cae6d6] dark:bg-[#1a3824] text-[#2A5C3B] dark:text-[#4ade80] flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-[#2A5C3B] group-hover:text-white transition-colors">
                                  {String(idx + 1).padStart(2, "0")}
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-foreground mb-0.5 truncate max-w-[160px]">{hub.name}</p>
                                  <p className="text-[10px] font-medium text-muted-foreground">{hub.total} listings · {hub.reserved} reservations</p>
                                </div>
                              </div>
                            )) : (
                              <div className="text-center text-muted-foreground text-sm py-4">No dining hall data yet.</div>
                            )}
                          </div>
                        </div>
                        <div className="mt-8 bg-muted/30 dark:bg-muted/10 rounded-2xl p-4 border border-border/50">
                          <p className="text-[9px] font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5 mb-2">
                            <span className="size-1.5 rounded-full bg-[#2A5C3B] dark:bg-emerald-500" /> Campus Network
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1 font-medium">
                            {topHubs[0]?.name ?? "No data"} is the top-performing dining hub with {topHubs[0]?.reserved ?? 0} reservations.
                          </p>
                        </div>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                    <div className="w-16 h-16 border-4 border-[#2A5C3B]/20 border-t-[#2A5C3B] dark:border-emerald-500/20 dark:border-t-emerald-500 rounded-full animate-spin mb-6" />
                    <p className="text-sm font-medium tracking-wide">Booting AI models & gathering telemetrics…</p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                GOD MODE TAB — system-wide control panel
            ══════════════════════════════════════════════════════ */}
            {activeTab === "godmode" && (
              <div className="space-y-8 pb-20">
                <div>
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">God Mode</h2>
                  <p className="text-muted-foreground font-medium">Full system control and lifecycle overview.</p>
                </div>

                {/* System Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "All Users", value: Math.max((stats.users ?? 0) - 1, 0), icon: Users, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
                    { label: "All Food Items", value: food.length, icon: Utensils, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
                    { label: "Active Listings", value: stats.activeFoodCount, icon: Package, color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
                    { label: "All Reservations", value: totalReservations, icon: ClipboardCheck, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="p-6 rounded-2xl bg-card border-none shadow-sm">
                      <div className={`size-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
                        <Icon className="size-5" />
                      </div>
                      <p className="text-3xl font-black text-foreground">{value}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
                    </Card>
                  ))}
                </div>

                {/* AI Summary */}
                {analytics && (
                  <Card className="p-8 bg-gradient-to-br from-[#2A5C3B] to-[#1a4026] border-none rounded-3xl shadow-xl text-white">
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-4">AI Engine Report</p>
                    <h3 className="text-3xl font-black mb-2">{analytics.analysis}</h3>
                    <p className="text-white/80 text-lg leading-relaxed mb-6">{analytics.details}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      {[
                        { label: "CO₂ Saved", value: `${analytics.environmental?.savedCO2 ?? 0} kg` },
                        { label: "Trees Equivalent", value: analytics.environmental?.treesPlanted ?? 0 },
                        { label: "Rescued Items", value: analytics.lifecycle?.pickedUp ?? 0 },
                        { label: "Expired Waste", value: analytics.lifecycle?.expiredWaste ?? 0 },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white/10 rounded-2xl p-4">
                          <p className="text-2xl font-black text-white">{value}</p>
                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                    {analytics.suggestionType !== "NONE" && (
                      <div className="mt-6">
                        <Button
                          className="bg-white text-emerald-900 hover:bg-white/90 font-bold rounded-full h-12 px-6"
                          onClick={handleApplySuggestion}
                          disabled={applying}
                        >
                          {applying ? "Applying…" : `Execute: ${analytics.suggestion}`}
                          <Zap className="ml-2 size-4" />
                        </Button>
                      </div>
                    )}
                  </Card>
                )}

                {/* Danger zone */}
                <Card className="p-8 border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10 rounded-3xl">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldAlert className="size-6 text-red-500" />
                    <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Admin Actions</h3>
                  </div>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-6">These actions affect live data. Proceed with caution.</p>
                  <div className="flex gap-4 flex-wrap">
                    <Button
                      variant="outline"
                      className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 font-bold rounded-full"
                      onClick={() => exportToCSV(users.filter((u) => u.role !== "admin"), "all_users.csv")}
                    >
                      <Download className="mr-2 size-4" /> Export All Users
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 font-bold rounded-full"
                      onClick={() => exportToCSV(food, "all_food.csv")}
                    >
                      <Download className="mr-2 size-4" /> Export All Food Data
                    </Button>
                    <Button
                      className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-full border-none"
                      onClick={() => { clearAuth(); window.location.href = "/login"; }}
                    >
                      <LogOut className="mr-2 size-4" /> Exit Admin Mode
                    </Button>
                  </div>
                </Card>
              </div>
            )}
            {/* ══════════════════════════════════════════════════════
                ACTIVITY LOGS TAB
            ══════════════════════════════════════════════════════ */}
            {activeTab === "logs" && (() => {
              const LOG_TYPES = [
                { key: "all",            label: "All Events",      color: "text-gray-500"    },
                { key: "login",          label: "Login",           color: "text-blue-500"    },
                { key: "register",       label: "Register",        color: "text-purple-500"  },
                { key: "verify_fail",    label: "Verify Fail",     color: "text-red-400"     },
                { key: "password_reset", label: "Password Reset",  color: "text-yellow-600"  },
                { key: "profile_update", label: "Profile Update",  color: "text-sky-500"     },
                { key: "reservation",    label: "Reservation",     color: "text-green-500"   },
                { key: "pickup",         label: "Pickup",          color: "text-teal-500"    },
                { key: "food_create",    label: "Food Post",       color: "text-orange-500"  },
                { key: "food_delete",    label: "Food Remove",     color: "text-red-500"     },
                { key: "user_delete",    label: "User Deleted",    color: "text-rose-600"    },
                { key: "ai",             label: "AI Engine",       color: "text-violet-500"  },
                { key: "data_fetch",     label: "Data Fetch",      color: "text-gray-400"    },
                { key: "system",         label: "System",          color: "text-slate-500"   },
              ];

              const EVENT_STYLES: Record<string, { dot: string; badge: string; row: string }> = {
                login:          { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",         row: "hover:bg-blue-50/40 dark:hover:bg-blue-900/10"    },
                register:       { dot: "bg-purple-500", badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400",                     row: "hover:bg-purple-50/40 dark:hover:bg-purple-900/10" },
                verify_fail:    { dot: "bg-red-400",    badge: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400",                                   row: "hover:bg-red-50/30 dark:hover:bg-red-900/10"       },
                password_reset: { dot: "bg-yellow-500", badge: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",                   row: "hover:bg-yellow-50/40 dark:hover:bg-yellow-900/10" },
                profile_update: { dot: "bg-sky-500",    badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400",                                   row: "hover:bg-sky-50/40 dark:hover:bg-sky-900/10"       },
                reservation:    { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",   row: "hover:bg-green-50/40 dark:hover:bg-green-900/10"   },
                pickup:         { dot: "bg-teal-500",   badge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400",                             row: "hover:bg-teal-50/40 dark:hover:bg-teal-900/10"     },
                food_create:    { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400",                   row: "hover:bg-orange-50/40 dark:hover:bg-orange-900/10" },
                food_delete:    { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",             row: "hover:bg-red-50/40 dark:hover:bg-red-900/10"       },
                user_delete:    { dot: "bg-rose-600",   badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400",                             row: "hover:bg-rose-50/40 dark:hover:bg-rose-900/10"     },
                ai:             { dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400",                   row: "hover:bg-violet-50/40 dark:hover:bg-violet-900/10" },
                data_fetch:     { dot: "bg-gray-400",   badge: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",                                 row: "hover:bg-gray-50/40 dark:hover:bg-gray-900/10"     },
                system:         { dot: "bg-slate-500",  badge: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",                           row: "hover:bg-slate-50/40 dark:hover:bg-slate-900/10"   },
                error:          { dot: "bg-red-600",    badge: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300",                                 row: "hover:bg-red-50/50 dark:hover:bg-red-900/10"       },
              };

              const LEVEL_ICONS: Record<string, React.ReactElement> = {
                success: <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />,
                info:    <AlertCircle  className="w-3.5 h-3.5 text-blue-400 shrink-0"  />,
                warning: <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
                error:   <X className="w-3.5 h-3.5 text-red-500 shrink-0" />,
              };

              const filteredLogs = logs
                .filter(l => logFilter === "all" || l.type === logFilter)
                .filter(l => {
                  if (!logSearch) return true;
                  const q = logSearch.toLowerCase();
                  return (
                    l.message?.toLowerCase().includes(q) ||
                    l.actor?.toLowerCase().includes(q) ||
                    l.detail?.toLowerCase().includes(q) ||
                    l.type?.toLowerCase().includes(q)
                  );
                });

              return (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col h-full min-h-[80vh]"
                >
                  {/* Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">System Intelligence</p>
                      <h2 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                        Activity Logs
                        <span className="relative flex h-3 w-3 ml-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                        </span>
                      </h2>
                      <p className="text-muted-foreground mt-2 font-medium text-sm">Live platform event stream · auto-refreshing every 4s</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setAutoScroll(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                          autoScroll
                            ? "bg-green-500/10 border-green-400/40 text-green-600 dark:text-green-400"
                            : "bg-muted border-border text-muted-foreground"
                        }`}
                      >
                        <Radio className="w-3.5 h-3.5" />
                        {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-border/60 font-semibold"
                        onClick={() => { setLogFilter("all"); setLogSearch(""); }}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-2" /> Clear Filters
                      </Button>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={logSearch}
                        onChange={e => setLogSearch(e.target.value)}
                        placeholder="Search by message, actor, or detail..."
                        className="pl-10 rounded-xl bg-card/60 border-border/50 focus-visible:ring-1 focus-visible:ring-[#1a5c2e]"
                      />
                    </div>
                    {/* Filter Chips */}
                    <div className="flex flex-wrap gap-2">
                      {LOG_TYPES.map(t => (
                        <button
                          key={t.key}
                          onClick={() => setLogFilter(t.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            logFilter === t.key
                              ? "bg-[#1a5c2e] text-white border-[#1a5c2e] shadow-sm"
                              : "border-border/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground bg-card/50"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
                    {LOG_TYPES.slice(1).map(t => {
                      const count = logs.filter(l => l.type === t.key).length;
                      return (
                        <div
                          key={t.key}
                          onClick={() => setLogFilter(t.key)}
                          className="bg-card/60 border border-border/40 rounded-2xl p-3 text-center cursor-pointer hover:border-border transition-all"
                        >
                          <p className="text-xl font-black text-foreground">{count}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${t.color}`}>{t.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Log Stream */}
                  <div className="flex-1 bg-gray-950 dark:bg-black rounded-[2rem] overflow-hidden border border-gray-800 shadow-xl">
                    {/* Terminal Titlebar */}
                    <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-900 border-b border-gray-800">
                      <span className="w-3 h-3 rounded-full bg-red-500/80" />
                      <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <span className="w-3 h-3 rounded-full bg-green-500/80" />
                      <span className="ml-3 text-[11px] font-mono font-bold text-gray-500 tracking-widest uppercase">
                        veridianpulse — activity-monitor — {filteredLogs.length} events
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        {logsLoading && (
                          <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            streaming
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Log Entries */}
                    <div className="overflow-y-auto max-h-[600px] p-2 scroll-smooth">
                      {filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
                          <Terminal className="w-10 h-10 mb-4 opacity-40" />
                          <p className="font-mono text-sm">No events found</p>
                          <p className="font-mono text-xs mt-2 opacity-60">Perform actions on the platform to generate logs</p>
                        </div>
                      ) : (
                        filteredLogs.map((log: any) => {
                          const style = EVENT_STYLES[log.type] || EVENT_STYLES["error"];
                          const ts = new Date(log.timestamp);
                          const timeStr = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
                          const dateStr = ts.toLocaleDateString([], { month: "short", day: "numeric" });

                          return (
                            <div
                              key={log.id}
                              className={`flex items-start gap-3 px-3 py-2.5 rounded-xl font-mono transition-colors ${style.row} border border-transparent hover:border-white/5 group`}
                            >
                              {/* Seq Number */}
                              <span className="text-[10px] text-gray-600 w-8 shrink-0 pt-0.5 font-bold">
                                {String(log.seq).padStart(4, "0")}
                              </span>

                              {/* Timestamp */}
                              <div className="text-[10px] text-gray-500 shrink-0 pt-0.5 w-20 leading-tight">
                                <span className="block">{dateStr}</span>
                                <span className="block text-gray-600">{timeStr}</span>
                              </div>

                              {/* Colored dot */}
                              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />

                              {/* Type badge */}
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0 mt-0.5 ${style.badge}`}>
                                {log.type?.replace("_", " ")}
                              </span>

                              {/* Level icon */}
                              <span className="mt-0.5 shrink-0">{LEVEL_ICONS[log.level] || LEVEL_ICONS["info"]}</span>

                              {/* Message */}
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] text-gray-200 font-semibold leading-tight truncate">{log.message}</p>
                                {(log.actor || log.detail) && (
                                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                                    {log.actor && <span className="text-gray-400 mr-3">{log.role && `[${log.role}] `}{log.actor}</span>}
                                    {log.detail && <span>{log.detail}</span>}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </div>

                  {/* Footer */}
                  <p className="text-center text-xs text-muted-foreground font-mono mt-4 opacity-60">
                    {filteredLogs.length} of {logs.length} events shown · Last 500 platform events retained in memory
                  </p>
                </motion.div>
              );
            })()}

          </motion.div>
        </main>

        {/* MOBILE BOTTOM NAV */}
        <nav className="fixed bottom-0 w-full bg-card/90 backdrop-blur-md border-t border-border flex lg:hidden items-center justify-around p-2 z-50 pb-safe">
          {([
            { id: "overview",  icon: LayoutDashboard },
            { id: "users",     icon: Users           },
            { id: "food",      icon: Utensils        },
            { id: "analytics", icon: TrendingUp      },
          ] as { id: ActiveTab; icon: any }[]).map(({ id, icon: Icon }) => (
            <Button
              key={id}
              variant="ghost"
              className={`flex-col h-14 w-14 ${activeTab === id ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={20} />
            </Button>
          ))}
        </nav>
      </div>
    </ProtectedRoute>
  );
}
