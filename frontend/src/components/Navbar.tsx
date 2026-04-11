"use client";

import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex justify-between items-center px-10 py-6 border-b border-border"
    >
      <BrandLogo size={36} subtitle="Food Rescue Network" wordmarkSize="md" />

      <div className="flex gap-3 items-center">
        <ModeToggle />
        <Link href="/login">
          <Button variant="ghost">Login</Button>
        </Link>
        <Link href="/dashboard">
          <Button>Dashboard</Button>
        </Link>
      </div>
    </motion.nav>
  );
}
