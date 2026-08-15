"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import ProtectedRoute from "@/components/ProtectedRoute";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  ShoppingBag,
  X,
  ChevronRight,
  Calendar,
  Clock,
  Leaf,
  QrCode,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { getAuth } from "@/lib/auth";

// ── Types ───────────────────────────────────────────────────────────────────

interface Food {
  id: number;
  name: string;
  dining_hall: string;
  location: string;
  image_url?: string;
  expiry_time?: string;
  allergens?: string;
  price?: number;
}

interface Reservation {
  id: number;
  reservation_code: string;
  quantity: number;
  status: "reserved" | "picked_up" | "cancelled" | "processing_queue";
  createdAt: string;
  qrCodeUrl: string;
  Food?: Food;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  reserved: {
    label: "Scheduled",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    icon: Calendar,
  },
  picked_up: {
    label: "Picked Up",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    icon: AlertCircle,
  },
  processing_queue: {
    label: "Processing",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    icon: Loader2,
  },
} as const;

function getStatusCfg(status: string) {
  return (
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.reserved
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const, delay: i * 0.07 },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const drawerVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 340, damping: 34 },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: 0.22, ease: "easeIn" as const },
  },
};

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusCfg(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ReservationCard({
  res,
  onClick,
}: {
  res: Reservation;
  onClick: () => void;
}) {
  const food = res.Food;
  const cfg = getStatusCfg(res.status);

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2, boxShadow: "0 8px 32px rgba(26,92,46,0.10)" }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer transition-all duration-200 flex"
    >
      {/* Food Image */}
      <div className="relative w-32 sm:w-36 flex-shrink-0 self-stretch bg-gray-100 overflow-hidden">
        {food?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={food.image_url}
            alt={food.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-gray-300" />
          </div>
        )}
        {/* Status overlay badge */}
        <div className="absolute top-2 left-2">
          <StatusBadge status={res.status} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
                {food?.name ?? "Unknown Food"}
              </h3>
              <p className="text-[11px] font-mono text-[#1a5c2e] mt-0.5 font-semibold tracking-wider">
                Code: {res.reservation_code}
              </p>
            </div>

            {/* QR thumbnail */}
            <div className="flex-shrink-0 bg-gray-50 border border-gray-200 rounded-xl p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={res.qrCodeUrl}
                alt="QR"
                className="w-10 h-10 object-contain"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Package className="w-3 h-3" />
              Qty: {res.quantity}
            </span>
            {food?.dining_hall && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                {food.dining_hall}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-gray-400">
            {timeAgo(res.createdAt)}
          </span>
          {res.status === "reserved" && (
            <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Collection pending
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({
  res,
  onClose,
}: {
  res: Reservation;
  onClose: () => void;
}) {
  const food = res.Food;
  const cfg = getStatusCfg(res.status);
  const StatusIcon = cfg.icon;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        variants={drawerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header image */}
        <div className="relative h-52 bg-gray-100 flex-shrink-0 overflow-hidden">
          {food?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={food.image_url}
              alt={food.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#eef8ee] to-[#c7efd4]">
              <ShoppingBag className="w-16 h-16 text-[#1a5c2e]/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Status at bottom of image */}
          <div className="absolute bottom-4 left-4">
            <StatusBadge status={res.status} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title */}
          <div>
            <h2 className="text-2xl font-black text-gray-900">
              {food?.name ?? "Unknown Food"}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Reserved on {formatDate(res.createdAt)}
            </p>
          </div>

          {/* Status card */}
          <div className={`rounded-xl border p-4 ${cfg.color} flex items-center gap-3`}>
            <StatusIcon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">{cfg.label}</p>
              <p className="text-xs mt-0.5 opacity-80">
                {res.status === "reserved"
                  ? "Your order is scheduled and awaiting pickup."
                  : res.status === "picked_up"
                  ? "You've successfully picked up this order!"
                  : res.status === "cancelled"
                  ? "This reservation was cancelled."
                  : "Your order is being processed in the queue."}
              </p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoTile
              label="Reservation Code"
              value={res.reservation_code}
              mono
            />
            <InfoTile label="Quantity" value={`${res.quantity} serving(s)`} />
            <InfoTile label="Location" value={food?.dining_hall ?? "N/A"} />
            <InfoTile label="Landmark" value={food?.location ?? "N/A"} />
            {food?.expiry_time && (
              <InfoTile
                label="Expiry"
                value={formatDate(food.expiry_time)}
                span2
              />
            )}
            {food?.allergens && (
              <InfoTile
                label="Allergens"
                value={food.allergens}
                span2
                warn
              />
            )}
          </div>

          {/* QR Code */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col items-center gap-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Pickup QR Code
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={res.qrCodeUrl}
              alt="QR Code"
              className="w-40 h-40 object-contain"
            />
            <p className="text-[11px] text-gray-400 text-center">
              Show this to the donor/admin to confirm pickup.
            </p>
          </div>
        </div>

        {/* Footer */}
        {res.status === "reserved" && (
          <div className="p-4 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-[#1a5c2e] bg-[#eef8ee] rounded-xl px-4 py-3">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">
                Collect before expiry time to earn points!
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

function InfoTile({
  label,
  value,
  mono = false,
  span2 = false,
  warn = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  span2?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`bg-gray-50 rounded-xl p-3 ${span2 ? "col-span-2" : ""} ${warn ? "bg-amber-50 border border-amber-100" : ""}`}
    >
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p
        className={`text-sm font-semibold text-gray-800 leading-snug ${mono ? "font-mono tracking-wider text-[#1a5c2e]" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

// ── Sustainable Impact Banner ────────────────────────────────────────────────

function ImpactBanner({ count }: { count: number }) {
  const co2 = (count * 0.6).toFixed(1);
  const name = getAuth()?.name ?? "Student";

  return (
    <motion.div
      variants={fadeUp}
      custom={3}
      className="bg-[#eef8ee] border border-[#c7efd4] rounded-2xl p-5 flex items-center justify-between gap-4 overflow-hidden relative"
    >
      <div className="relative z-10">
        <h4 className="font-black text-[#1a5c2e] text-lg mb-1">
          Sustainable Impact 🌿
        </h4>
        <p className="text-sm text-[#4a7c59] leading-relaxed max-w-xs">
          By picking up {count > 0 ? `these ${count} meals` : "meals"} this
          week, you&apos;ve saved{" "}
          <span className="font-bold">{co2}kg of CO₂</span> emissions. Keep it
          up, {name.split(" ")[0]}!
        </p>
        <button className="mt-3 bg-[#1a5c2e] text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-[#16502a] transition-colors">
          Explore More Deals
        </button>
      </div>
      <div className="text-[80px] select-none pointer-events-none absolute right-4 bottom-0 opacity-20">
        🌿
      </div>
    </motion.div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["History", "Upcoming", "Subscriptions"] as const;
type Tab = (typeof TABS)[number];

// ── Main Page ────────────────────────────────────────────────────────────────

function ReservationsContent() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("History");
  const [search, setSearch] = useState("");

  const userName = getAuth()?.name ?? "Student";

  useEffect(() => {
    api
      .get("/reservation/my")
      .then((res) => setReservations(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Filter by active tab
  const tabFiltered = useMemo(() => {
    if (activeTab === "Upcoming")
      return reservations.filter((r) => r.status === "reserved");
    if (activeTab === "History")
      return reservations.filter((r) =>
        ["picked_up", "cancelled"].includes(r.status)
      );
    // "Subscriptions" — show all for now
    return reservations;
  }, [reservations, activeTab]);

  // Apply search
  const filtered = useMemo(() => {
    if (!search) return tabFiltered;
    const q = search.toLowerCase();
    return tabFiltered.filter(
      (r) =>
        r.Food?.name?.toLowerCase().includes(q) ||
        r.reservation_code.toLowerCase().includes(q) ||
        r.Food?.dining_hall?.toLowerCase().includes(q)
    );
  }, [tabFiltered, search]);

  const pickedUpCount = reservations.filter((r) => r.status === "picked_up").length;

  return (
    <div className="min-h-screen bg-[#eef8ee]">
      {/* ── HEADER ── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" as const }}
        className="bg-[#eef8ee] px-5 lg:px-7 py-3 sticky top-0 z-30 border-b border-[#d4edda]"
      >
        <div className="flex items-center gap-4 max-w-screen-xl mx-auto">
          {/* Tabs */}
          <div className="flex items-center gap-1 flex-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${
                  activeTab === tab
                    ? "text-[#1a5c2e]"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {activeTab === tab && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-2 -bottom-[1px] h-[2px] bg-[#1a5c2e] rounded-full hidden"
                  />
                )}
                <span
                  className={
                    activeTab === tab
                      ? "border-b-2 border-[#1a5c2e] pb-0.5"
                      : ""
                  }
                >
                  {tab.toUpperCase()}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-[#1a5c2e]/20 focus:border-[#1a5c2e]/40 w-44 placeholder:text-gray-400 transition-all"
            />
          </div>
        </div>
      </motion.header>

      {/* ── BODY ── */}
      <div className="px-5 lg:px-7 py-6 max-w-screen-xl mx-auto">
        {/* Hero heading */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="mb-7"
        >
          <h1 className="text-3xl font-black text-gray-900">
            My Reservations 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 max-w-md leading-relaxed">
            Manage your upcoming organic food collections and track your past
            impact on sustainable dining.
          </p>
        </motion.div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 mt-4"
          >
            <QrCode className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-600">No orders found</h3>
            <p className="text-sm text-gray-400 mt-1">
              {search
                ? `No results for "${search}"`
                : activeTab === "Upcoming"
                ? "You have no upcoming reservations."
                : "Your reservation history will appear here."}
            </p>
          </motion.div>
        )}

        {/* Cards grid */}
        {!loading && filtered.length > 0 && (
          <motion.div
            key={activeTab + search}
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 xl:grid-cols-2 gap-4"
          >
            {filtered.map((res) => (
              <ReservationCard
                key={res.id}
                res={res}
                onClick={() => setSelected(res)}
              />
            ))}
          </motion.div>
        )}

        {/* Impact banner */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-8"
          >
            <ImpactBanner count={pickedUpCount} />
          </motion.div>
        )}
      </div>

      {/* ── DETAIL DRAWER ── */}
      <AnimatePresence>
        {selected && (
          <DetailDrawer res={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MyReservationsPage() {
  return (
    <ProtectedRoute allowedRole="student">
      <ReservationsContent />
    </ProtectedRoute>
  );
}
