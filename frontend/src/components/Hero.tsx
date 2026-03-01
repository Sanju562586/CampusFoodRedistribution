"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center h-[85vh] text-center px-6 overflow-hidden">
      
      {/* Glow background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.15),transparent_60%)]" />

      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-6xl font-extrabold tracking-tight max-w-4xl"
      >
        Reduce Food Waste.
        <br />
        <span className="bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
          Feed the Campus.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-muted-foreground max-w-xl"
      >
        A real-time platform that redistributes surplus dining hall food using
        smart systems and AI-powered recommendations.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-10 flex gap-4"
      >
        <Link href="/login">
          <Button size="lg">Get Started</Button>
        </Link>
        <Link href="/admin">
          <Button size="lg" variant="outline">
            Admin Portal
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}
