"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * High-performance 3D page transition wrapping every page route.
 * Provides subtle scale, elevation, and blur dissolve.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="app-route"
        initial={
          reduceMotion
            ? false
            : { opacity: 0, y: 16, scale: 0.988, filter: "blur(6px)" }
        }
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={
          reduceMotion
            ? undefined
            : { opacity: 0, y: -12, scale: 0.992, filter: "blur(4px)" }
        }
        transition={{
          duration: reduceMotion ? 0 : 0.36,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
