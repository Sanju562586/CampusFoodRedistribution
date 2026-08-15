"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * A multi-layered 3D atmospheric background rendered across every page.
 * Includes floating glowing spheres and mesh grid for depth perception.
 */
export default function AppAtmosphere() {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="app-atmosphere">
      {/* Floating 3D Orbs */}
      <motion.span
        className="app-orb app-orb--violet"
        animate={reduceMotion ? undefined : { x: [0, 80, -35, 0], y: [0, 60, 95, 0], scale: [1, 1.18, 0.92, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="app-orb app-orb--lime"
        animate={reduceMotion ? undefined : { x: [0, -100, 45, 0], y: [0, -45, 65, 0], scale: [1, 0.88, 1.12, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="app-orb app-orb--coral"
        animate={reduceMotion ? undefined : { x: [0, 45, -55, 0], y: [0, -75, 35, 0], rotate: [0, 25, -15, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Subtle Floating Ambient Particles */}
      {!reduceMotion && (
        <>
          <motion.div
            className="absolute top-1/4 left-1/5 w-2 h-2 rounded-full bg-emerald-400/40 blur-[1px]"
            animate={{ y: [0, -30, 0], opacity: [0.3, 0.8, 0.3], scale: [1, 1.5, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-2/3 right-1/4 w-3 h-3 rounded-full bg-indigo-400/30 blur-[1px]"
            animate={{ y: [0, 40, 0], opacity: [0.2, 0.7, 0.2], scale: [1, 1.3, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute top-1/3 right-1/3 w-2.5 h-2.5 rounded-full bg-lime-300/40 blur-[1px]"
            animate={{ x: [0, 25, 0], y: [0, -20, 0], opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </>
      )}

      {/* Grid Mesh */}
      <span className="app-grid" />
    </div>
  );
}
