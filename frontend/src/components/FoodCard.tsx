"use client";

import { useState } from "react";
import ReserveModal from "@/components/ReserveModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

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
};

export default function FoodCard({ food }: { food: Food }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <ReserveModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        food={food}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden border-border bg-card shadow-lg hover:shadow-2xl transition-all duration-300 group flex flex-col h-full">
          {/* Image Placeholder */}
          <div
            className="h-48 bg-muted/50 relative flex items-center justify-center overflow-hidden cursor-pointer group-hover:bg-muted/70 transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-60" />

            {food.image_url ? (
              <img
                src={food.image_url}
                alt={food.name}
                className="w-full h-full object-cover z-0 group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <span className="text-6xl z-0 group-hover:scale-110 transition-transform duration-500">🍔</span>
            )}

            {/* Floating Info */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
              <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md text-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {food.quantity} Left
              </div>
              <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md text-foreground text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm">
                Exp: {new Date(food.expiry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Price Tag */}
            <div className="absolute bottom-3 left-3 z-20">
              <div className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                {food.price && food.price > 0 ? `₹${food.price}` : "Free"}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 flex-1 flex flex-col">
            <div className="flex justify-between items-start flex-1">
              <div>
                <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-purple-500 transition-colors">{food.name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 mb-2">
                  <span className="font-medium text-foreground/80">
                    📍 {food.location || food.dining_hall}
                    {food.landmark && <span className="text-xs opacity-70 ml-1">({food.landmark})</span>}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                  Delicious meal available. Don't miss out!
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 py-5 transition-all active:scale-95"
              >
                Order Now 🛍️
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </>
  );
}
