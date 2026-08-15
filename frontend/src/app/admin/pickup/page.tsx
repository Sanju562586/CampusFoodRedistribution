"use client";

import { useState } from "react";
import api from "@/lib/axios";
import ProtectedRoute from "@/components/ProtectedRoute";
import TiltSurface from "@/components/TiltSurface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, CheckCircle2, XCircle, Search, ShieldCheck, Sparkles, User, Mail, Hash, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PickupPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await api.post("/reservation/pickup", {
        reservation_code: code.trim().toUpperCase(),
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed. Code may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRole="admin">
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8">
        {/* Glowing Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Back Link */}
        <div className="w-full max-w-xl mb-6 flex items-center justify-between z-10">
          <Link href="/admin">
            <motion.div
              whileHover={{ x: -3 }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Admin Panel
            </motion.div>
          </Link>
          <span className="glass-pill text-xs font-bold px-3 py-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Verification
          </span>
        </div>

        {/* 3D Scanner Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xl z-10"
        >
          <TiltSurface intensity={6} className="w-full">
            <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden border border-white/40 dark:border-white/10 shadow-2xl">
              {/* Top Accent Bar */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

              {/* Header */}
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner"
                >
                  <QrCode className="w-8 h-8" />
                </motion.div>
                <h1 className="text-2xl font-black tracking-tight">Pickup Verification Scanner</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Enter the student&apos;s 8-character reservation code to confirm food pickup.
                </p>
              </div>

              {/* Laser Animation Viewport */}
              <div className="relative h-28 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/[0.03] flex items-center justify-center overflow-hidden">
                <motion.div
                  animate={{ y: [-40, 40, -40] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399]"
                />
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest bg-background/80 px-4 py-2 rounded-full border border-emerald-500/20 shadow-sm z-10">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> Scanner Ready
                </div>
              </div>

              {/* Input & Action */}
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    placeholder="ENTER CODE (E.G. R8X9A2K4)"
                    maxLength={12}
                    className="h-14 text-center font-mono text-xl tracking-[0.25em] font-extrabold bg-background/60 border-2 border-emerald-500/30 focus:border-emerald-500 rounded-2xl shadow-inner uppercase"
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                </div>

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleVerify}
                    disabled={loading || !code.trim()}
                    className="w-full h-13 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    {loading ? "Verifying Pickup..." : "Verify Pickup Code"}
                  </Button>
                </motion.div>
              </div>

              {/* Results & Feedback */}
              <AnimatePresence mode="wait">
                {result && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 space-y-4"
                  >
                    <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-extrabold text-lg">
                      <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                      <span>Pickup Confirmed Successfully!</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm pt-2 border-t border-emerald-500/20">
                      <div className="space-y-1">
                        <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Hash className="w-3 h-3" /> Code
                        </span>
                        <p className="font-mono font-black text-foreground text-base">
                          {result.reservation?.reservation_code || code}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <User className="w-3 h-3" /> Student
                        </span>
                        <p className="font-bold text-foreground">
                          {result.reservation?.User?.name || "Verified Student"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Email
                        </span>
                        <p className="font-medium text-muted-foreground truncate">
                          {result.reservation?.User?.email || "—"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Roll Number
                        </span>
                        <p className="font-medium text-foreground">
                          {result.reservation?.User?.roll_number || "—"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 flex items-center gap-3 text-destructive font-bold text-sm"
                  >
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TiltSurface>
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}
