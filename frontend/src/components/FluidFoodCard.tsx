"use client";

import { useState } from "react";
import ReserveModal from "@/components/ReserveModal";
import { MapPin, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";

type Food = {
  id: number;
  name: string;
  quantity: number;
  dining_hall: string;
  expiry_time: string;
  allergens: string[];
  image_url?: string | null;
  price?: number;
  location?: string;
  landmark?: string;
  description?: string;
  category?: string;
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493770348161-369560ae357d?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop"
];

export function getFoodImage(food: Partial<Food>): string {
  if (food.image_url) {
    if (food.image_url.startsWith("http") || food.image_url.startsWith("data:")) return food.image_url;
    return `http://localhost:5000${food.image_url.startsWith('/') ? '' : '/'}${food.image_url}`;
  }
  const hash = (food.name || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) + (food.id || 0);
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
}

function getTimeRemaining(expiryTime: string): { label: string; urgent: boolean } {
  const now = new Date();
  const expiry = new Date(expiryTime);
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return { label: "Expired", urgent: true };
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHrs >= 1) return { label: `${diffHrs}h left`, urgent: diffHrs <= 2 };
  return { label: `${diffMins}m left`, urgent: true };
}

function isVegan(food: Food): boolean {
  if (food.category === "vegetarian" || food.category === "vegan") return true;
  if (food.allergens && !food.allergens.some((a) =>
    ["meat", "fish", "chicken", "beef", "pork", "seafood", "egg"].includes(a.toLowerCase())
  )) {
    return ["veg", "salad", "grain", "fruit", "dal", "pulao", "sabzi", "tofu"]
      .some((k) => food.name?.toLowerCase().includes(k));
  }
  return false;
}

export default function FluidFoodCard({ food }: { food: Food }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const locationLabel = food.location || food.dining_hall;
  const { label: timeLabel, urgent } = getTimeRemaining(food.expiry_time);
  const vegan = isVegan(food);

  return (
    <>
      <ReserveModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        food={food}
      />

      <motion.div
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="glass-food-card rounded-3xl overflow-hidden flex flex-col h-full group relative"
      >
        {/* Top shimmer highlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0.9) 70%, transparent)" }}
        />

        {/* ── IMAGE ── */}
        <div
          className="relative w-full h-48 cursor-pointer overflow-hidden flex-shrink-0"
          onClick={() => setIsModalOpen(true)}
        >
          <img
            src={getFoodImage(food)}
            alt={food.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
            style={{ transform: "scale(1)", transition: "transform 0.5s ease" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

          {/* ── Glass badges top-left ── */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            <span className="glass-pill text-gray-800 dark:text-gray-100 text-[11px] font-bold px-3 py-1 rounded-full">
              {food.quantity} left
            </span>
            <span
              className={`text-white text-[11px] font-semibold px-3 py-1 rounded-full backdrop-blur-md border ${
                urgent
                  ? "bg-red-500/75 border-red-300/30"
                  : "bg-emerald-600/70 border-emerald-400/30"
              }`}
            >
              <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
              {timeLabel}
            </span>
          </div>

          {/* Price tag — bottom right */}
          <div className="absolute bottom-3 right-3 z-10">
            <span className="glass-pill text-emerald-800 dark:text-emerald-200 text-[11px] font-black px-3 py-1 rounded-full">
              {food.price && food.price > 0 ? `₹${food.price}` : "Free"}
            </span>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="px-5 pt-4 pb-5 flex flex-col flex-1">
          {/* Name + vegan badge */}
          <div className="flex items-start gap-2 mb-2">
            <h3
              className="text-base font-bold text-gray-900 dark:text-gray-50 leading-tight flex-1 line-clamp-1 cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
              onClick={() => setIsModalOpen(true)}
            >
              {food.name}
            </h3>
            {vegan && (
              <span className="flex-shrink-0 mt-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 border border-emerald-300/50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                Vegan
              </span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 mb-4">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate">
              {locationLabel}
            </span>
          </div>

          {/* CTA Button */}
          <div className="mt-auto">
            <motion.button
              onClick={() => setIsModalOpen(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full text-white font-bold text-sm py-3 rounded-2xl relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #1a5c2e 0%, #22863a 50%, #16a34a 100%)",
                boxShadow: "0 4px 16px rgba(26,92,46,0.40), inset 0 1px 0 rgba(255,255,255,0.20)",
              }}
            >
              {/* Button inner sheen */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.20) 0%, transparent 60%)" }}
              />
              <span className="relative z-10">Reserve Now</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
