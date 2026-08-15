"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/axios";
import ProtectedRoute from "@/components/ProtectedRoute";
import TiltSurface from "@/components/TiltSurface";
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
  Sparkles,
  Ticket,
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
    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dot: "bg-amber-500",
    icon: Calendar,
  },
  picked_up: {
    label: "Picked Up",
    color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    dot: "bg-red-500",
    icon: AlertCircle,
  },
  processing_queue: {
    label: "Processing",
    color: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    dot: "bg-sky-500",
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

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusCfg(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${cfg.color}`}
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

  return (
    <TiltSurface intensity={4} className="w-full">
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={onClick}
        className="glass-card rounded-3xl border border-white/40 dark:border-white/10 overflow-hidden cursor-pointer flex flex-col sm:flex-row shadow-lg hover:shadow-2xl transition-all group relative"
      >
        {/* Top Shine Line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        {/* Food Image */}
        <div className="relative w-full sm:w-44 h-40 sm:h-auto flex-shrink-0 bg-muted overflow-hidden">
          {food?.image_url ? (
            <img
              src={food.image_url}
              alt={food.name}
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
              <ShoppingBag className="w-10 h-10 text-emerald-600/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent sm:hidden" />
          <div className="absolute top-3 left-3 z-10">
            <StatusBadge status={res.status} />
          </div>
        </div>

        {/* Ticket Content */}
        <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-extrabold text-foreground text-lg leading-tight truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {food?.name ?? "Rescued Meal"}
                </h3>
                <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 tracking-widest uppercase">
                  CODE: {res.reservation_code}
                </p>
              </div>

              {/* QR Thumbnail */}
              {res.qrCodeUrl && (
                <div className="flex-shrink-0 bg-white dark:bg-gray-900 border border-border rounded-xl p-1.5 shadow-sm group-hover:scale-105 transition-transform">
                  <img
                    src={res.qrCodeUrl}
                    alt="QR"
                    className="w-11 h-11 object-contain"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-500" />
                {res.quantity} serving(s)
              </span>
              {food?.dining_hall && (
                <span className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  {food.dining_hall}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60 text-xs">
            <span className="text-muted-foreground font-medium">
              {timeAgo(res.createdAt)}
            </span>
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">
              <span>View Pass</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </motion.div>
    </TiltSurface>
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
        onClick={onClose}
      />

      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-background text-foreground z-50 shadow-2xl flex flex-col overflow-hidden border-l border-border"
      >
        {/* Header Image */}
        <div className="relative h-56 bg-muted flex-shrink-0 overflow-hidden">
          {food?.image_url ? (
            <img
              src={food.image_url}
              alt={food.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
              <ShoppingBag className="w-16 h-16 text-emerald-600/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-background/60 backdrop-blur-md rounded-full flex items-center justify-center border border-border text-foreground hover:bg-background transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-4 left-5">
            <StatusBadge status={res.status} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-foreground">
              {food?.name ?? "Rescued Meal Pass"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Reserved on {formatDate(res.createdAt)}
            </p>
          </div>

          <div className={`rounded-2xl border p-4 ${cfg.color} flex items-center gap-3 shadow-sm`}>
            <StatusIcon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">{cfg.label}</p>
              <p className="text-xs opacity-90 mt-0.5">
                {res.status === "reserved"
                  ? "Show your QR code to the donor or admin upon pickup."
                  : res.status === "picked_up"
                  ? "Pickup verified! Thank you for reducing campus food waste."
                  : res.status === "cancelled"
                  ? "This reservation has been cancelled."
                  : "Order queued and being processed."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoTile label="Pickup Code" value={res.reservation_code} mono />
            <InfoTile label="Quantity" value={`${res.quantity} serving(s)`} />
            <InfoTile label="Location" value={food?.dining_hall ?? "N/A"} />
            <InfoTile label="Landmark" value={food?.location ?? "N/A"} />
          </div>

          {/* 3D Glowing QR Container */}
          <TiltSurface intensity={6}>
            <div className="glass-card rounded-3xl p-6 border border-white/40 dark:border-white/10 flex flex-col items-center gap-3 shadow-xl bg-white dark:bg-gray-900">
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <QrCode className="w-4 h-4" /> Pickup Pass QR Code
              </span>
              {res.qrCodeUrl && (
                <div className="p-3 bg-white rounded-2xl shadow-inner border border-gray-200">
                  <img
                    src={res.qrCodeUrl}
                    alt="QR Code"
                    className="w-44 h-44 object-contain"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center font-medium">
                Present this QR code to confirm pickup.
              </p>
            </div>
          </TiltSurface>
        </div>
      </motion.div>
    </>
  );
}

function InfoTile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="glass-card rounded-2xl p-3.5 border border-border">
      <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1">
        {label}
      </p>
      <p
        className={`text-sm font-bold text-foreground truncate ${mono ? "font-mono tracking-wider text-emerald-600 dark:text-emerald-400" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────

function ReservationsContent() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get("/reservation/my-reservations")
      .then((res) => setReservations(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeReservations = useMemo(
    () => reservations.filter((r) => r.status === "reserved" || r.status === "processing_queue"),
    [reservations]
  );

  const historyReservations = useMemo(
    () => reservations.filter((r) => r.status === "picked_up" || r.status === "cancelled"),
    [reservations]
  );

  const currentList = activeTab === "active" ? activeReservations : historyReservations;

  const filteredList = useMemo(
    () =>
      currentList.filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          r.reservation_code.toLowerCase().includes(q) ||
          r.Food?.name.toLowerCase().includes(q) ||
          r.Food?.dining_hall.toLowerCase().includes(q)
        );
      }),
    [currentList, search]
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Search Header */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-header px-5 lg:px-7 py-3.5 flex items-center gap-4 sticky top-0 z-30"
      >
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reservations by code or meal name..."
              className="w-full pl-10 pr-4 py-2.5 bg-background/80 rounded-full border border-border text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </motion.header>

      <div className="px-5 lg:px-7 py-6 max-w-screen-xl mx-auto space-y-8">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 glass-pill px-3 py-1 rounded-full">
            <Ticket className="w-3.5 h-3.5" /> Order Tickets
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 flex items-center gap-3">
            My Reservations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage active pickup codes and view your sustainability meal history.
          </p>
        </motion.div>

        {/* Animated Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-1">
          {[
            { id: "active", label: "Active Passes", count: activeReservations.length },
            { id: "history", label: "History", count: historyReservations.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative px-5 py-2.5 rounded-2xl text-sm font-extrabold transition-all ${
                activeTab === tab.id
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="res-tab-pill"
                  className="absolute inset-0 glass-nav-pill rounded-2xl"
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.label}
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {tab.count}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Card List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 glass-card rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredList.map((res) => (
                  <ReservationCard
                    key={res.id}
                    res={res}
                    onClick={() => setSelectedRes(res)}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 glass-panel rounded-3xl border border-dashed border-border p-8"
              >
                <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-bold">No reservations found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeTab === "active"
                    ? "You don't have any active meal reservations right now."
                    : "Your past reservation history will appear here."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selectedRes && (
          <DetailDrawer
            res={selectedRes}
            onClose={() => setSelectedRes(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <ProtectedRoute allowedRole="student">
      <ReservationsContent />
    </ProtectedRoute>
  );
}
