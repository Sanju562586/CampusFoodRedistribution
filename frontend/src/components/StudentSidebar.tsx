"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  TrendingUp,
  ShoppingBag,
  Settings,
  HelpCircle,
} from "lucide-react";

const navItems = [
  { label: "Food Gallery",  icon: UtensilsCrossed, href: "/dashboard",              exact: true  },
  { label: "Impact Stats",  icon: TrendingUp,       href: "/dashboard/leaderboard",  exact: false },
  { label: "Orders",        icon: ShoppingBag,      href: "/dashboard/reservations", exact: false },
  { label: "Settings",      icon: Settings,         href: "/dashboard?tab=profile",  exact: false },
];

const sidebarVariants = {
  hidden: { x: -40, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" as const, staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { x: -16, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export default function StudentSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    const base = href.split("?")[0];
    if (exact) return pathname === "/dashboard";
    return pathname.startsWith(base) && base !== "/dashboard";
  };

  return (
    <motion.aside
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-56 bg-[#eef8ee] z-40 border-r border-[#d4edda]"
    >
      {/* ── Brand ── */}
      <motion.div variants={itemVariants} className="px-5 pt-7 pb-5">
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="cursor-default"
        >
          <BrandLogo
            size={38}
            subtitle="Student Portal"
            titleClassName="text-[1.02rem]"
            wordmarkSize="sm"
          />
        </motion.div>
      </motion.div>

      {/* ── Nav links ── */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ label, icon: Icon, href, exact }) => {
          const active = isActive(href, exact);

          return (
            <motion.div key={label} variants={itemVariants} className="relative">
              {/* Active background pill — animates with layoutId */}
              <AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              <Link
                href={href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 group z-10 ${
                  active
                    ? "text-[#1a5c2e] font-semibold"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      active ? "text-[#1a5c2e]" : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                </motion.div>
                {label}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* ── Bottom ── */}
      <motion.div variants={itemVariants} className="px-4 pb-6">
        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: "#e5f5e9" }}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2 text-gray-400 text-sm py-2 transition-colors rounded-xl"
        >
          <HelpCircle className="w-4 h-4" />
          Help Center
        </motion.button>
      </motion.div>
    </motion.aside>
  );
}
