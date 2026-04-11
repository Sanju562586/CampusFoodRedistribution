"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import api from "@/lib/axios";
import { getAuth, clearAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  History, PlusCircle, LogOutIcon, DollarSign, ScanLine, Utensils, Hash, Clock,
  MapPin, Tag, Camera, Upload, X, ShieldCheck, Rocket, Info, HelpCircle, ChevronDown,
  TrendingUp, Trash2, Package, Download, BarChart3, Award, RefreshCw,
  ChevronRight, AlertCircle, CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import HistoryDetailsModal from "@/components/HistoryDetailsModal";
import { Scanner } from "@yudiel/react-qr-scanner";

// ── CSV helper ────────────────────────────────────────────────
function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type DonorTab = "post" | "pickup" | "history" | "analytics";

export default function DonorPage() {
  const [activeTab, setActiveTab] = useState<DonorTab>("post");
  const [user, setUser] = useState<any>(null);

  // ── Form State ────────────────────────────────────────────
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [expiry, setExpiry] = useState("");
  const [hall, setHall] = useState("");
  const [landmark, setLandmark] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<string | null>(null);

  // ── Camera State ──────────────────────────────────────────
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraOpen(true);
    } catch (err) {
      alert("Could not access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setImage(canvas.toDataURL("image/jpeg"));
      }
      stopCamera();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── Pickup State ──────────────────────────────────────────
  const [pickupCode, setPickupCode] = useState("");
  const [pickupResult, setPickupResult] = useState<any>(null);
  const [pickupError, setPickupError] = useState("");
  const [pickupLoading, setPickupLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // ── History State ─────────────────────────────────────────
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // History filter state
  const [histSearch, setHistSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "picked_up" | "expired">("all");
  const [dateFilter, setDateFilter] = useState("");

  // ── Analytics State ───────────────────────────────────────
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── Effects ───────────────────────────────────────────────
  useEffect(() => {
    setUser(getAuth());
  }, []);

  useEffect(() => {
    if (activeTab === "history" || activeTab === "analytics") {
      setHistoryLoading(true);
      api
        .get("/food/my-listings")
        .then((res) => setHistory(res.data))
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [activeTab]);

  // ── Helpers ───────────────────────────────────────────────
  const toggleAllergen = (a: string) =>
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const getStatus = (item: any): "expired" | "picked_up" | "available" => {
    if (new Date(item.expiry_time) < new Date()) return "expired";
    if (item.quantity === 0) return "picked_up";
    return "available";
  };

  const statusLabel: Record<string, { label: string; cls: string }> = {
    expired:   { label: "EXPIRED",   cls: "bg-red-100    text-red-600    border-red-200"     },
    picked_up: { label: "PICKED UP", cls: "bg-blue-100   text-blue-700   border-blue-200"   },
    available: { label: "ACTIVE",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  };

  // Filtered history
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const st = getStatus(item);
      const nameMatch = !histSearch || item.name?.toLowerCase().includes(histSearch.toLowerCase());
      const statusMatch = statusFilter === "all" || st === statusFilter;
      const dateMatch = !dateFilter || new Date(item.createdAt).toISOString().startsWith(dateFilter);
      return nameMatch && statusMatch && dateMatch;
    });
  }, [history, histSearch, statusFilter, dateFilter]);

  // ── Analytics derivations ─────────────────────────────────
  const analytics = useMemo(() => {
    const totalItems = history.length;
    const totalQty = history.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalReservations = history.reduce((s, i) => s + (i.Reservations?.length || 0), 0);
    const pickedUpItems = history.filter((i) => {
      const res = i.Reservations || [];
      return res.some((r: any) => r.status === "picked_up");
    }).length;
    const expiredItems = history.filter((i) => getStatus(i) === "expired").length;
    const activeItems = history.filter((i) => getStatus(i) === "available").length;
    const CO2_PER_KG = 2.5;
    const savedQty = history.reduce((s, i) => {
      const pickedUp = (i.Reservations || []).filter((r: any) => r.status === "picked_up").reduce((sum: number, r: any) => sum + r.quantity, 0);
      return s + pickedUp;
    }, 0);
    const savedCO2 = (savedQty * CO2_PER_KG).toFixed(1);
    const taxCredit = (savedQty * 2.5).toFixed(0);
    const tonsApprox = (totalQty * 0.0005).toFixed(2);
    const rescueRate = totalItems > 0 ? Math.round((pickedUpItems / totalItems) * 100) : 0;
    return { totalItems, totalQty, totalReservations, pickedUpItems, expiredItems, activeItems, savedQty, savedCO2, taxCredit, tonsApprox, rescueRate };
  }, [history]);

  // ── Handlers ──────────────────────────────────────────────
  const handlePost = async () => {
    setLoading(true);
    setMessage("");
    try {
      await api.post("/food/create", {
        name,
        quantity: Number(quantity),
        expiry_time: new Date(expiry).toISOString(),
        dining_hall: hall,
        location: hall,
        landmark,
        price: price ? Number(price) : 0,
        allergens,
        image_url: image,
      });
      setMessage("✅ Food posted successfully");
      setName(""); setQuantity(""); setPrice(""); setExpiry(""); setHall(""); setLandmark(""); setAllergens([]); setImage(null);
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || "Failed to post food"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPickup = async (overrideCode?: string) => {
    const codeToVerify = overrideCode || pickupCode;
    if (!codeToVerify) return;
    setPickupLoading(true);
    setPickupError("");
    setPickupResult(null);
    try {
      const res = await api.post("/reservation/pickup", { reservation_code: codeToVerify.trim().toUpperCase() });
      setPickupResult(res.data);
      setPickupCode("");
    } catch (err: any) {
      setPickupError(err.response?.data?.message || "Verification failed");
    } finally {
      setPickupLoading(false);
    }
  };

  const handleRepost = (item: any) => {
    setName(item.name || "");
    setQuantity(item.quantity?.toString() || "");
    setPrice(item.price?.toString() || "");
    setHall(item.dining_hall || "");
    setLandmark(item.landmark || "");
    setAllergens(Array.isArray(item.allergens) ? item.allergens : []);
    setActiveTab("post");
    setMessage("✏️ Form pre-filled from selected item. Update details and publish.");
  };

  const handleDownloadReport = () => {
    const rows = [
      ["Item Name", "Quantity", "Dining Hall", "Status", "Price", "Posted Date", "Expiry Date"],
      ...history.map((item) => [
        item.name, item.quantity, item.dining_hall, getStatus(item),
        item.price ?? 0,
        new Date(item.createdAt).toLocaleDateString(),
        new Date(item.expiry_time).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    downloadCSV(csv, "donation_history.csv");
  };

  // ── Sidebar nav ───────────────────────────────────────────
  return (
    <ProtectedRoute allowedRole="donor">
      <div className="flex min-h-screen bg-[#f6faf6]">

        {/* ── Sidebar ── */}
        <aside className="w-56 border-r border-[#d4edda] bg-[#eef8ee] flex-col hidden md:flex sticky top-0 h-screen z-40">
          <div className="px-5 pt-7 pb-5">
            <BrandLogo
              size={38}
              subtitle="Partner Portal"
              titleClassName="text-[1.02rem]"
              wordmarkSize="sm"
            />
          </div>

          <nav className="flex-1 px-3 space-y-0.5">
            {([
              { id: "post",      label: "Post New Food",    icon: PlusCircle },
              { id: "pickup",    label: "Verify Pickup",    icon: ScanLine   },
              { id: "history",   label: "Donation History", icon: History    },
              { id: "analytics", label: "Impact & Revenue", icon: BarChart3  },
            ] as const).map(({ id, label, icon: Icon }) => (
              <div key={id} className="relative">
                <AnimatePresence>
                  {activeTab === id && (
                    <motion.div
                      layoutId="donor-sidebar-active-pill"
                      className="absolute inset-0 bg-white rounded-xl shadow-sm"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </AnimatePresence>
                <button
                  onClick={() => setActiveTab(id)}
                  className={`group relative w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors duration-150 rounded-xl z-10 ${
                    activeTab === id
                      ? "text-[#1a5c2e] font-semibold"
                      : "text-gray-500 hover:text-gray-800 hover:bg-[#e5f5e9]"
                  }`}
                >
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        activeTab === id ? "text-[#1a5c2e]" : "text-gray-400 group-hover:text-gray-600"
                      }`}
                    />
                  </motion.div>
                  {label}
                </button>
              </div>
            ))}
          </nav>

          <div className="px-4 pb-6 mt-auto">
            <motion.button
              onClick={() => { clearAuth(); window.location.href = "/login"; }}
              whileHover={{ scale: 1.02, backgroundColor: "#fee2e2" }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-600 font-semibold text-sm py-2 transition-colors rounded-xl"
            >
              <LogOutIcon className="w-4 h-4" /> Log Out
            </motion.button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto relative mb-24 md:mb-0">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >

            {/* ═══════════════════════════════════════════════
                POST NEW FOOD TAB
            ═══════════════════════════════════════════════ */}
            {activeTab === "post" && (
              <div className="min-h-screen">
                <header className="bg-white border-b border-[#e2ede2] px-7 py-3.5 flex items-center justify-between sticky top-0 z-30">
                  <h2 className="text-lg font-black text-[#1a5c2e] tracking-tight">Donor Portal</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1a5c2e] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {user?.name?.[0]?.toUpperCase() ?? "D"}
                    </div>
                  </div>
                </header>

                <div className="px-7 py-8 max-w-screen-xl mx-auto">
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-8">
                    <h1 className="text-4xl font-black text-gray-900 leading-tight">Share Your Surplus</h1>
                    <p className="text-gray-500 text-base mt-2 max-w-xl leading-relaxed">
                      Transform excess inventory into community impact. Your contribution helps reduce waste and supports local food security.
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
                    {/* ── LEFT: Form ── */}
                    <div className="space-y-6">
                      {/* Step 1: Food Details */}
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.35 }} className="space-y-4">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-7 h-7 rounded-full bg-[#1a5c2e] text-white text-sm font-black flex items-center justify-center flex-shrink-0">1</div>
                          <h3 className="text-xl font-black text-gray-900">Food Details</h3>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Name</label>
                          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Artisanal Sourdough Boules" className="h-11 bg-white border-[#e2ede2] rounded-xl focus:border-[#1a5c2e] text-gray-800 placeholder:text-gray-300 shadow-sm" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity Available</label>
                            <div className="relative">
                              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="12" className="h-11 bg-white border-[#e2ede2] rounded-xl text-gray-800 pr-14 shadow-sm" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">units</span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price (0 = Free)</label>
                            <div className="relative flex items-center">
                              <span className="absolute left-3 text-sm text-gray-400 font-semibold">$</span>
                              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="h-11 bg-white border-[#e2ede2] rounded-xl text-gray-800 pl-7 shadow-sm" />
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Step 2: Logistics */}
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }} className="space-y-4 pt-2">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-7 h-7 rounded-full bg-[#1a5c2e] text-white text-sm font-black flex items-center justify-center flex-shrink-0">2</div>
                          <h3 className="text-xl font-black text-gray-900">Logistics</h3>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Area / Campus Zone</label>
                          <div className="relative">
                            <select value={hall} onChange={(e) => setHall(e.target.value)} className="w-full h-11 appearance-none bg-white border border-[#e2ede2] rounded-xl px-3 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 focus:border-[#1a5c2e] shadow-sm">
                              <option value="">Select campus zone…</option>
                              <option>North Campus – Culinary Wing</option>
                              <option>South Campus – Main Cafeteria</option>
                              <option>East Block – Food Court</option>
                              <option>West Annex – Snack Bar</option>
                              <option>Central Hub – Dining Hall</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Specific Landmark / Room</label>
                          <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Room 402, near the west elevator" className="h-11 bg-white border-[#e2ede2] rounded-xl text-gray-800 placeholder:text-gray-300 shadow-sm" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Best Before Date & Time</label>
                          <Input type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="h-11 bg-white border-[#e2ede2] rounded-xl text-gray-600 shadow-sm" />
                        </div>
                      </motion.div>

                      {/* Step 3: Dietary & Allergens */}
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35 }} className="space-y-4 pt-2">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-7 h-7 rounded-full bg-[#1a5c2e] text-white text-sm font-black flex items-center justify-center flex-shrink-0">3</div>
                          <h3 className="text-xl font-black text-gray-900">Dietary & Allergens</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free", "Halal", "Kosher", "Spicy"].map((a) => (
                            <motion.button
                              key={a} whileTap={{ scale: 0.94 }} onClick={() => toggleAllergen(a)}
                              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 select-none ${
                                allergens.includes(a)
                                  ? "bg-[#1a5c2e] text-white border-[#1a5c2e] shadow-sm"
                                  : "bg-white text-gray-600 border-[#d6e8d6] hover:border-[#1a5c2e]/40 hover:text-[#1a5c2e] shadow-sm"
                              }`}
                            >
                              {allergens.includes(a) && <span className="mr-1">✓</span>}
                              {a}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>

                      {/* Status Message */}
                      <AnimatePresence>
                        {message && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                              message.includes("✅") || message.includes("✏️")
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {message}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* ── RIGHT: Sticky sidebar cards ── */}
                    <div className="space-y-4 lg:sticky lg:top-[65px]">
                      {/* Visual Verification */}
                      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12, duration: 0.35 }} className="bg-white rounded-2xl border border-[#e2ede2] p-5 space-y-3">
                        <p className="font-black text-gray-800 text-sm">Visual Verification</p>

                        {isCameraOpen ? (
                          <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                              <button onClick={(e) => { e.preventDefault(); stopCamera(); }} className="bg-red-500/80 text-white text-xs font-bold px-4 py-2 rounded-full backdrop-blur-sm">Cancel</button>
                              <button onClick={(e) => { e.preventDefault(); capturePhoto(); }} className="bg-white text-black text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />Capture
                              </button>
                            </div>
                          </div>
                        ) : image ? (
                          <div className="relative rounded-xl overflow-hidden aspect-square">
                            <img src={image} alt="Preview" className="w-full h-full object-cover" />
                            <button onClick={(e) => { e.preventDefault(); setImage(null); }} className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="rounded-xl border-2 border-dashed border-[#e2ede2] bg-[#f6faf6] aspect-[4/3] flex flex-col items-center justify-center gap-2 text-center px-4">
                            <div className="w-10 h-10 rounded-full bg-white border border-[#e2ede2] flex items-center justify-center">
                              <Camera className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-sm font-bold text-gray-600">Upload Product Image</p>
                            <p className="text-[11px] text-gray-400 leading-snug">Clear photos help users identify listings quickly</p>
                          </div>
                        )}

                        {!image && !isCameraOpen && (
                          <div className="space-y-2">
                            <button onClick={(e) => { e.preventDefault(); startCamera(); }} className="w-full flex items-center justify-center gap-2 bg-[#1a5c2e] hover:bg-[#16502a] text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
                              <Camera className="w-4 h-4" /> Take Photo
                            </button>
                            <label className="block">
                              <div className="w-full flex items-center justify-center gap-2 bg-[#f6faf6] hover:bg-[#eef8ee] text-gray-600 border border-[#e2ede2] text-sm font-bold py-2.5 rounded-xl transition-colors cursor-pointer">
                                <Upload className="w-4 h-4" /> Upload File
                              </div>
                              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                          </div>
                        )}
                      </motion.div>

                      {/* Publish Card */}
                      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.35 }} className="bg-[#eef8ee] border border-[#c7efd4] rounded-2xl p-5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#1a5c2e] flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-black text-gray-800 text-sm">Ready to publish?</p>
                            <p className="text-xs text-gray-500 mt-0.5">All listings are vetted for quality.</p>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                          onClick={handlePost} disabled={loading}
                          className="w-full bg-[#1a5c2e] hover:bg-[#16502a] text-white font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                        >
                          {loading ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing…</>
                          ) : (
                            <><Rocket className="w-4 h-4" /> Publish Listing Now</>
                          )}
                        </motion.button>
                        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                          By publishing, you confirm the food is safe for consumption.
                        </p>
                      </motion.div>

                      {/* Pro-tip */}
                      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22, duration: 0.35 }} className="bg-white border border-[#e2ede2] rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Info className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          <span className="font-bold text-gray-700">Pro-tip:</span> Adding a landmark like &ldquo;Near the blue vending machine&rdquo; helps volunteers find the pickup spot 30% faster.
                        </p>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════
                PICKUP VERIFICATION TAB
            ═══════════════════════════════════════════════ */}
            {activeTab === "pickup" && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="max-w-3xl mx-auto p-6 md:p-10 lg:p-16 w-full flex flex-col items-center"
              >
                {/* Header */}
                <div className="w-full mb-10 text-center md:text-left">
                  <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase mb-3 flex items-center justify-center md:justify-start gap-2">
                    Operations <ChevronRight className="w-3 h-3 text-gray-400" /> <span className="text-[#1a5c2e]">Pickup Verification</span>
                  </p>
                  <h1 className="text-4xl md:text-5xl font-black text-gray-800 tracking-tight leading-none mb-1">
                    Excellence Edition
                  </h1>
                  <h2 className="text-4xl md:text-5xl font-black text-[#1a5c2e] tracking-tight leading-none">
                    Pickup Verification
                  </h2>
                </div>

                {/* Central Card */}
                <div className="w-full bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10 border border-gray-100">
                  {/* Scan QR Section */}
                  <div className="mb-8">
                    {!isScanning ? (
                      <button
                         onClick={() => setIsScanning(true)}
                         className="w-full bg-[#f6f7f3] hover:bg-[#eff1ea] border border-transparent rounded-[2rem] p-12 flex flex-col items-center justify-center transition-colors group cursor-pointer"
                      >
                         <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                           <ScanLine className="w-8 h-8 text-[#1a5c2e]" />
                         </div>
                         <h3 className="text-xl font-bold text-gray-800 mb-2">Scan QR Code</h3>
                         <p className="text-sm text-gray-500">Use your device camera to verify instantly</p>
                      </button>
                    ) : (
                      <div className="w-full rounded-[2rem] overflow-hidden border-2 border-green-500/50 aspect-video relative bg-black shadow-inner">
                        <Scanner onScan={(result) => {
                          if (result && result.length > 0) {
                            const code = result[0].rawValue;
                            if (code) {
                              setPickupCode(code);
                              setIsScanning(false);
                              handleVerifyPickup(code);
                            }
                          }
                        }} />
                        <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-md transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center py-2 mb-8">
                    <div className="flex-grow border-t border-gray-100"></div>
                    <span className="flex-shrink-0 mx-4 text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">OR</span>
                    <div className="flex-grow border-t border-gray-100"></div>
                  </div>

                  {/* Manual Code Section */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                        Manual Reservation Code
                      </label>
                      <div className="relative">
                        <Input
                          value={pickupCode}
                          onChange={(e) => setPickupCode(e.target.value)}
                          placeholder="Enter 8-digit code"
                          className="w-full bg-[#fafafa] border-none text-gray-800 placeholder:text-gray-400 h-14 px-5 rounded-2xl text-lg font-medium focus-visible:ring-1 focus-visible:ring-[#2f5e3e]"
                          onKeyDown={(e) => e.key === "Enter" && handleVerifyPickup()}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                          <Hash className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <Button 
                      className="w-full h-14 bg-[#31613b] hover:bg-[#254b2d] text-white rounded-2xl font-semibold text-lg shadow-lg shadow-green-900/10 transition-all flex items-center justify-center gap-3" 
                      onClick={() => handleVerifyPickup()} 
                      disabled={pickupLoading || !pickupCode}
                    >
                      <ShieldCheck className="w-5 h-5" />
                      {pickupLoading ? "Verifying Protocol..." : "Verify Pickup"}
                    </Button>

                    {pickupResult && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 border border-green-200 p-5 rounded-2xl space-y-3 mt-4">
                        <div className="flex items-center gap-3 text-green-700">
                          <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-700" />
                          </div>
                          <p className="font-bold text-lg">Verification Successful</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 text-sm text-gray-700 shadow-sm border border-green-100">
                          <div className="grid grid-cols-2 gap-y-2">
                            <p><span className="text-gray-400">Item:</span> <span className="font-semibold">{pickupResult.reservation.Food?.name}</span></p>
                            <p><span className="text-gray-400">Qty:</span> <span className="font-semibold">{pickupResult.reservation.quantity}</span></p>
                            <p><span className="text-gray-400">Code:</span> <span className="font-mono bg-gray-100 px-1 rounded">{pickupResult.reservation.reservation_code}</span></p>
                            {pickupResult.reservation.User && (
                              <p><span className="text-gray-400">Student:</span> <span className="font-semibold">{pickupResult.reservation.User.name}</span></p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {pickupError && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-start gap-3 mt-4">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="font-medium">{pickupError}</p>
                      </motion.div>
                    )}
                  </div>

                  {/* Footer Box */}
                  <div className="mt-10 bg-[#fafafa] rounded-2xl p-5 flex items-start gap-4">
                    <ShieldCheck className="w-5 h-5 text-gray-800 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">Secure Verification Protocol</h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-sm">
                        Each verification is logged with GPS coordinates and timestamps. Ensuring the highest standards of food safety and logistical chain of custody.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Watermark */}
                <p className="mt-12 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                  System Version 4.8.2 — Excellence Edition
                </p>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════
                DONATION HISTORY TAB
            ═══════════════════════════════════════════════ */}
            {activeTab === "history" && (
              <div className="min-h-screen">
                <header className="bg-white border-b border-[#e2ede2] px-7 py-3.5 flex items-center justify-between sticky top-0 z-30">
                  <div className="relative">
                    <input
                      type="text"
                      value={histSearch}
                      onChange={(e) => setHistSearch(e.target.value)}
                      placeholder="Search history..."
                      className="pl-9 pr-4 py-2 bg-[#f6faf6] border border-[#e2ede2] rounded-full text-sm outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 w-52 text-gray-600 placeholder:text-gray-400"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  </div>
                  <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-2.5 pl-3 border-l border-[#e2ede2]">
                      <div className="w-9 h-9 rounded-full bg-[#1a5c2e] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user?.name?.[0]?.toUpperCase() ?? "D"}
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-gray-800 leading-tight">{user?.name ?? "Donor"}</p>
                        <p className="text-[10px] text-gray-400">Donor Account</p>
                      </div>
                    </div>
                  </div>
                </header>

                <div className="px-7 py-8 max-w-screen-xl mx-auto">
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-7">
                    <h1 className="text-4xl font-black text-gray-900 leading-tight">Donation History</h1>
                    <p className="text-gray-500 text-base mt-2 max-w-2xl leading-relaxed">
                      Review your listing history. {history.length > 0 && <>You&apos;ve posted <span className="font-bold text-[#1a5c2e]">{history.length} items</span> totalling <span className="font-bold text-[#1a5c2e]">{analytics.totalQty} units</span>.</>}
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
                    {/* LEFT: Cards */}
                    <div className="space-y-5">
                      {historyLoading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => <div key={i} className="h-36 bg-white rounded-2xl border border-[#e2ede2] animate-pulse" />)}
                        </div>
                      ) : filteredHistory.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-[#e2ede2]">
                          <History className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                          <h3 className="text-lg font-bold text-gray-500">{history.length === 0 ? "No History Yet" : "No Matches"}</h3>
                          <p className="text-sm text-gray-400 mt-1">
                            {history.length === 0 ? "Your past food listings will appear here." : "Try changing your filters."}
                          </p>
                          {(histSearch || statusFilter !== "all" || dateFilter) && (
                            <button onClick={() => { setHistSearch(""); setStatusFilter("all"); setDateFilter(""); }} className="mt-3 text-sm text-[#1a5c2e] font-semibold hover:underline">
                              Clear Filters
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {filteredHistory.length} listing{filteredHistory.length !== 1 ? "s" : ""} {histSearch || statusFilter !== "all" ? "(filtered)" : ""}
                          </p>
                          {filteredHistory.map((item: any, idx: number) => {
                            const st = getStatus(item);
                            const cfg = statusLabel[st];
                            const postDate = new Date(item.createdAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
                            const expDate  = new Date(item.expiry_time).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
                            const isExp = st === "expired";

                            return (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04, duration: 0.32 }}
                                className={`bg-white rounded-2xl border border-[#e2ede2] overflow-hidden ${isExp ? "opacity-70" : ""}`}
                              >
                                <div className="flex gap-0">
                                  <div className="w-32 sm:w-36 flex-shrink-0 self-stretch bg-gray-100 overflow-hidden relative">
                                    {item.image_url ? (
                                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#eef8ee] to-[#d4edda] text-4xl">🍽️</div>
                                    )}
                                    {isExp && <div className="absolute inset-0 bg-gray-900/20" />}
                                  </div>

                                  <div className="flex-1 p-4 space-y-2 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <h3 className={`font-black text-lg leading-tight ${isExp ? "text-gray-400" : "text-gray-900"}`}>{item.name}</h3>
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
                                      <span>Qty: {item.quantity} units</span>
                                      <span>Posted: {postDate}</span>
                                      {item.dining_hall && <span>{item.dining_hall}</span>}
                                      {isExp ? (
                                        <span className="text-red-500 font-semibold">Expired: {expDate}</span>
                                      ) : (
                                        <span className="text-emerald-600 font-semibold">Active</span>
                                      )}
                                      {(item.Reservations?.length > 0) && (
                                        <span className="text-blue-600 font-semibold">{item.Reservations.length} reservation(s)</span>
                                      )}
                                    </div>

                                    {isExp && (
                                      <p className="text-xs text-gray-400 italic leading-snug">
                                        No pickup was requested before the quality window closed.
                                      </p>
                                    )}

                                    {!isExp && (
                                      <div className="flex gap-2 pt-1">
                                        <button onClick={() => { setSelectedFood(item); setIsDetailsOpen(true); }} className="px-4 py-1.5 bg-white border border-[#e2ede2] rounded-lg text-xs font-bold text-gray-700 hover:bg-[#f6faf6] hover:border-[#1a5c2e]/30 transition-colors">
                                          View Details
                                        </button>
                                        <button onClick={() => handleRepost(item)} className="px-4 py-1.5 bg-[#eef8ee] border border-[#c7efd4] rounded-lg text-xs font-bold text-[#1a5c2e] hover:bg-[#d4edda] transition-colors">
                                          Re-post Similar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </>
                      )}
                    </div>

                    {/* RIGHT: Sidebar */}
                    <div className="space-y-4 lg:sticky lg:top-[65px]">
                      {/* Partner Impact */}
                      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.35 }} className="bg-[#1a5c2e] rounded-2xl p-5 space-y-4 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 text-[100px] opacity-10 select-none pointer-events-none rotate-12">🌿</div>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Partner Impact</p>
                        <div>
                          <p className="text-3xl font-black text-white">{analytics.tonsApprox} Tons</p>
                          <p className="text-xs text-white/60 mt-0.5">Total Food Shared</p>
                        </div>
                        <div className="border-t border-white/10 pt-3">
                          <p className="text-2xl font-black text-white">${Number(analytics.taxCredit).toLocaleString()}</p>
                          <p className="text-xs text-white/60 mt-0.5">Estimated Tax Credit</p>
                        </div>
                        <button onClick={handleDownloadReport} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                          <Download className="w-4 h-4" /> Download Report
                        </button>
                      </motion.div>

                      {/* Filter History */}
                      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.35 }} className="bg-white border border-[#e2ede2] rounded-2xl p-5 space-y-4">
                        <p className="font-black text-gray-800 text-sm">Filter History</p>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status</label>
                          <div className="flex flex-wrap gap-1.5">
                            {(["all", "available", "picked_up", "expired"] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                                  statusFilter === s
                                    ? "bg-[#1a5c2e] text-white border-[#1a5c2e]"
                                    : "bg-white text-gray-600 border-[#e2ede2] hover:border-[#1a5c2e]/40"
                                }`}
                              >
                                {s === "all" ? "All" : s === "available" ? "Active" : s === "picked_up" ? "Picked Up" : "Expired"}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">From Date</label>
                          <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full h-9 bg-[#f6faf6] border border-[#e2ede2] rounded-xl px-3 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]/20"
                          />
                        </div>

                        {(histSearch || statusFilter !== "all" || dateFilter) && (
                          <button onClick={() => { setHistSearch(""); setStatusFilter("all"); setDateFilter(""); }} className="w-full text-xs text-gray-400 hover:text-[#1a5c2e] font-semibold py-1 transition-colors">
                            Clear all filters
                          </button>
                        )}
                      </motion.div>

                      {/* Help */}
                      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.35 }} className="bg-[#eef8ee] border border-[#c7efd4] rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1a5c2e]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <HelpCircle className="w-4 h-4 text-[#1a5c2e]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-700">Need Pickup Help?</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Use the Verify Pickup tab to scan a student&apos;s QR code and confirm collection.</p>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>

                <HistoryDetailsModal open={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} food={selectedFood} />
              </div>
            )}

            {/* ═══════════════════════════════════════════════
                ANALYTICS / IMPACT & REVENUE TAB
            ═══════════════════════════════════════════════ */}
            {activeTab === "analytics" && (
              <div className="min-h-screen">
                <header className="bg-white border-b border-[#e2ede2] px-7 py-3.5 flex items-center justify-between sticky top-0 z-30">
                  <h2 className="text-lg font-black text-[#1a5c2e] tracking-tight">Impact & Revenue</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#e2ede2] text-[#1a5c2e] hover:bg-[#eef8ee] font-bold rounded-full"
                    onClick={handleDownloadReport}
                  >
                    <Download className="w-4 h-4 mr-2" /> Export Report
                  </Button>
                </header>

                <div className="px-7 py-8 max-w-screen-xl mx-auto">
                  {historyLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => <div key={i} className="h-36 bg-white rounded-2xl border border-[#e2ede2] animate-pulse" />)}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-4xl font-black text-gray-900 leading-tight mb-2">Your Impact</h1>
                        <p className="text-gray-500 max-w-xl leading-relaxed">
                          A complete breakdown of your donation activity, environmental impact, and community contributions.
                        </p>
                      </motion.div>

                      {/* Top Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "Total Listings",     value: analytics.totalItems,      icon: Package,    color: "from-[#1a5c2e] to-[#16502a]", text: "text-white" },
                          { label: "Total Qty Shared",   value: analytics.totalQty,        icon: Utensils,   color: "from-white to-[#f6faf6]", border: true, text: "text-gray-900" },
                          { label: "Reservations Made",  value: analytics.totalReservations, icon: Award,    color: "from-white to-[#f6faf6]", border: true, text: "text-gray-900" },
                          { label: "Items Picked Up",    value: analytics.pickedUpItems,   icon: TrendingUp, color: "from-white to-[#f6faf6]", border: true, text: "text-gray-900" },
                        ].map(({ label, value, icon: Icon, color, border, text }) => (
                          <motion.div
                            key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            className={`bg-gradient-to-br ${color} ${border ? "border border-[#e2ede2]" : ""} rounded-2xl p-5 relative overflow-hidden`}
                          >
                            <Icon className={`w-5 h-5 ${text === "text-white" ? "text-white/60" : "text-[#1a5c2e]"} mb-3`} />
                            <p className={`text-3xl font-black ${text}`}>{value}</p>
                            <p className={`text-[10px] font-bold ${text === "text-white" ? "text-white/60" : "text-gray-400"} uppercase tracking-widest mt-1`}>{label}</p>
                          </motion.div>
                        ))}
                      </div>

                      {/* Environmental Impact */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6 bg-gradient-to-br from-[#1a5c2e] to-[#16502a] border-none rounded-2xl text-white relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 text-[120px] opacity-10 select-none">🌿</div>
                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-4">Environmental Impact</p>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-3xl font-black">{analytics.savedCO2} kg</p>
                              <p className="text-xs text-white/60 mt-1">CO₂ Saved</p>
                            </div>
                            <div>
                              <p className="text-3xl font-black">{analytics.tonsApprox}</p>
                              <p className="text-xs text-white/60 mt-1">Tons Saved</p>
                            </div>
                            <div>
                              <p className="text-3xl font-black">{analytics.rescueRate}%</p>
                              <p className="text-xs text-white/60 mt-1">Rescue Rate</p>
                            </div>
                            <div>
                              <p className="text-3xl font-black">${Number(analytics.taxCredit).toLocaleString()}</p>
                              <p className="text-xs text-white/60 mt-1">Est. Tax Credit</p>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-6 bg-white border border-[#e2ede2] rounded-2xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Listing Status Breakdown</p>
                          <div className="space-y-4">
                            {[
                              { label: "Active Listings", value: analytics.activeItems, total: analytics.totalItems, color: "bg-emerald-500" },
                              { label: "Picked Up",   value: analytics.pickedUpItems, total: analytics.totalItems, color: "bg-blue-500" },
                              { label: "Expired",     value: analytics.expiredItems, total: analytics.totalItems, color: "bg-red-400" },
                            ].map(({ label, value, total, color }) => (
                              <div key={label}>
                                <div className="flex justify-between text-sm font-semibold text-gray-700 mb-1">
                                  <span>{label}</span>
                                  <span>{value} / {total}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }} animate={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className={`h-full ${color} rounded-full`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>

                      {/* CTA */}
                      <div className="bg-[#eef8ee] border border-[#c7efd4] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <p className="font-black text-gray-900 text-lg">Keep the impact growing!</p>
                          <p className="text-gray-500 text-sm mt-1">Post your next batch of surplus food to earn more impact points.</p>
                        </div>
                        <Button onClick={() => setActiveTab("post")} className="bg-[#1a5c2e] hover:bg-[#16502a] text-white font-bold rounded-full px-8 flex-shrink-0">
                          <PlusCircle className="w-4 h-4 mr-2" /> Post New Food
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        </main>

        {/* MOBILE BOTTOM NAV */}
        <nav className="fixed bottom-0 w-full bg-background/95 backdrop-blur-md border-t border-border flex md:hidden items-center justify-around p-2 z-50 pb-safe">
          {([
            { id: "post",      icon: PlusCircle },
            { id: "pickup",    icon: ScanLine   },
            { id: "history",   icon: History    },
            { id: "analytics", icon: BarChart3  },
          ] as const).map(({ id, icon: Icon }) => (
            <Button key={id} variant="ghost" className={`flex-col h-14 w-14 ${activeTab === id ? "text-green-500" : "text-muted-foreground"}`} onClick={() => setActiveTab(id)}>
              <Icon size={20} />
            </Button>
          ))}
        </nav>
      </div>
    </ProtectedRoute>
  );
}
