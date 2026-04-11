"use client";

import { useState } from "react";
import ReserveModal from "@/components/ReserveModal";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

// Card is animated from parent (stagger grid).
// Internal animations: hover lift + button press.

type Food = {
  id: number;
  name: string;
  quantity: number;
  dining_hall: string;
  expiry_time: string;
  allergens: string[];
  image_url?: string;
  price?: number;
  location?: string;
  landmark?: string;
  description?: string;
  category?: string;
};

function getTimeRemaining(expiryTime: string): { label: string; urgent: boolean } {
  const now = new Date();
  const expiry = new Date(expiryTime);
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return { label: "Expired", urgent: true };
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHrs >= 1) return { label: `Expires in ${diffHrs}h`, urgent: diffHrs <= 2 };
  return { label: `Expires in ${diffMins}m`, urgent: true };
}

function isVegan(food: Food): boolean {
  if (food.category === "vegetarian" || food.category === "vegan") return true;
  if (food.allergens && !food.allergens.some((a) =>
    ["meat", "fish", "chicken", "beef", "pork", "seafood", "egg"].includes(a.toLowerCase())
  )) {
    const veganKeywords = ["veg", "salad", "grain", "fruit", "dal", "pulao", "sabzi", "tofu"];
    return veganKeywords.some((k) => food.name?.toLowerCase().includes(k));
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
        whileHover={{ y: -4, boxShadow: "0 12px 28px rgba(0,0,0,0.10)" }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full"
      >
        {/* ── IMAGE ── */}
        <div
          className="relative w-full h-44 cursor-pointer overflow-hidden flex-shrink-0"
          onClick={() => setIsModalOpen(true)}
        >
          {food.image_url ? (
            <img
              src={food.image_url}
              alt={food.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <span className="text-6xl opacity-40">🍽️</span>
            </div>
          )}

          {/* Stacked badges — top left on image */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
            {/* Quantity pill */}
            <span className="bg-white text-gray-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
              {food.quantity} Left
            </span>
            {/* Expiry pill */}
            <span
              className={`text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm ${
                urgent ? "bg-red-500" : "bg-[#1a5c2e]/80 backdrop-blur-sm"
              }`}
            >
              {timeLabel}
            </span>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="px-4 pt-3 pb-4 flex flex-col flex-1">
          {/* Name + optional VEGAN badge */}
          <div className="flex items-start gap-2 mb-1.5">
            <h3
              className="text-base font-extrabold text-gray-900 leading-tight flex-1 line-clamp-1 cursor-pointer hover:text-[#1a5c2e] transition-colors"
              onClick={() => setIsModalOpen(true)}
            >
              {food.name}
            </h3>
            {vegan && (
              <span className="flex-shrink-0 mt-0.5 text-[10px] font-black text-[#22c55e] border border-[#22c55e] px-1.5 py-0.5 rounded-md uppercase tracking-wide leading-none">
                Vegan
              </span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 mb-3">
            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 font-medium truncate">
              {locationLabel}
              {food.landmark && (
                <span className="opacity-60">, {food.landmark}</span>
              )}
            </span>
          </div>

          <div className="mt-auto">
            <motion.button
              onClick={() => setIsModalOpen(true)}
              whileHover={{ scale: 1.02, backgroundColor: "#155026" }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-full bg-[#1a5c2e] text-white font-bold text-sm py-3 rounded-xl shadow-sm"
            >
              Order Now
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
