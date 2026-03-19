"use client";

import api from "@/lib/axios";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Tags } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  food: {
    id: number;
    name: string;
    quantity: number;
    dining_hall: string;
    expiry_time: string;
    allergens: string[];
    image_url?: string;
  };
};

export default function ReserveModal({ open, onClose, food }: Props) {
  const [status, setStatus] = useState<"confirm" | "loading" | "success">("confirm");
  const [quantity, setQuantity] = useState(1);

  const handleReserve = async () => {
    setStatus("loading");
    try {
      await api.post("/reservation/create", {
        foodId: food.id,
        quantity: Number(quantity),
      });
      setStatus("success");
    } catch (err: any) {
      alert(err.response?.data?.message || "Reservation failed");
      setStatus("confirm");
    }
  };

  const handleLocation = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(food.dining_hall)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border border-border/50 shadow-2xl rounded-3xl sm:max-w-[900px]">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
          {/* LEFT: IMAGE / HERO */}
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-black p-8 flex flex-col justify-center items-center overflow-hidden">

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-30">
              <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500 rounded-full blur-[80px]" />
              <div className="absolute bottom-10 right-10 w-32 h-32 bg-blue-500 rounded-full blur-[80px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center w-full">
              {food.image_url ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 20 }}
                  className="relative w-64 h-64 mb-8 rounded-[2rem] overflow-hidden shadow-2xl ring-4 ring-white/10"
                >
                  <img src={food.image_url} alt={food.name} className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-700" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative w-64 h-64 mb-8 bg-white/5 backdrop-blur-xl rounded-[2rem] shadow-2xl flex items-center justify-center ring-4 ring-white/10"
                >
                  <span className="text-8xl filter drop-shadow-lg">🍔</span>
                </motion.div>
              )}

              <div className="text-center space-y-3">
                <h3 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">{food.name}</h3>
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 text-sm font-semibold px-4 py-1.5 shadow-lg shadow-green-900/20">
                  Fresh & Ready
                </Badge>
              </div>
            </div>
          </div>

          {/* RIGHT: DETAILS & ACTION */}
          <div className="flex flex-col h-full bg-card">
            <div className="p-8 pb-0">
              <DialogHeader className="space-y-1.5 text-left">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">Detail Information</DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  Review the details below and reserve your meal before it runs out.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 p-8 space-y-6 overflow-y-auto">
              <div className="group flex items-start gap-4 p-4 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/50">
                <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <MapPin className="size-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider opacity-70 mb-1">Location</h4>
                  <p className="font-medium text-lg leading-tight">{food.dining_hall}</p>
                </div>
              </div>

              <div className="group flex items-start gap-4 p-4 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/50">
                <div className="bg-orange-500/10 p-3 rounded-2xl text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                  <Clock className="size-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider opacity-70 mb-1">Expiry Time</h4>
                  <p className="font-medium text-lg leading-tight">{new Date(food.expiry_time).toLocaleString()}</p>
                </div>
              </div>

              <div className="group flex items-start gap-4 p-4 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/50">
                <div className="bg-purple-500/10 p-3 rounded-2xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <Tags className="size-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider opacity-70 mb-1">Allergens & Diet</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(() => {
                      let parsedAllergens: string[] = [];
                      if (Array.isArray(food.allergens)) {
                        parsedAllergens = food.allergens;
                      } else if (typeof food.allergens === 'string') {
                        try {
                          parsedAllergens = JSON.parse(food.allergens || '[]');
                        } catch(e) { /* ignore */ }
                      }
                      
                      return parsedAllergens.length > 0 ? (
                        parsedAllergens.map(a => (
                          <Badge key={a} variant="outline" className="bg-background text-foreground/80 border-border/60">
                            {a}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground italic">None listed</span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION AREA - STICKY BOTTOM */}
            <div className="p-8 border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
              {status === "success" ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl flex flex-col items-center text-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-green-500/20">✓</div>
                  <div>
                    <h3 className="font-bold text-green-700 dark:text-green-400 text-lg">Reserved Successfully!</h3>
                    <p className="text-green-600/80 dark:text-green-500/80 text-sm">Pickup code generated.</p>
                  </div>
                  <Button onClick={onClose} variant="ghost" className="w-full text-green-700 hover:text-green-800 hover:bg-green-500/10">Close</Button>
                </motion.div>
              ) : status === "loading" ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-muted rounded-full" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="absolute top-0 left-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
                    />
                  </div>
                  <p className="text-muted-foreground font-medium animate-pulse">Processing Request...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-1">
                    <span className="font-medium text-muted-foreground ml-1">Quantity</span>
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/50">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="h-9 w-9 rounded-lg hover:bg-background shadow-none hover:shadow-sm transition-all"
                        disabled={quantity <= 1}
                      >
                        -
                      </Button>
                      <span className="font-bold w-8 text-center text-lg tabular-nums">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setQuantity(Math.min(food.quantity, quantity + 1))}
                        className="h-9 w-9 rounded-lg hover:bg-background shadow-none hover:shadow-sm transition-all"
                        disabled={quantity >= food.quantity}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[auto_1fr] gap-4">
                    <Button
                      variant="outline"
                      onClick={handleLocation}
                      className="h-14 w-14 rounded-2xl border-2 hover:border-blue-500 hover:bg-blue-500/5 hover:text-blue-600 transition-all p-0 flex items-center justify-center"
                      title="Get Location"
                    >
                      <MapPin className="size-6" />
                    </Button>
                    <Button
                      onClick={handleReserve}
                      className="h-14 rounded-2xl text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                    >
                      Reserve Now
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
