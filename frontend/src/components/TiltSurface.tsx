"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import type { PropsWithChildren } from "react";

type TiltSurfaceProps = PropsWithChildren<{
  className?: string;
  intensity?: number;
  elevateOnHover?: boolean;
}>;

/**
 * Adds a smooth, pointer-driven 3D tilt with realistic lighting glare
 * and depth elevation for premium UI surfaces.
 */
export default function TiltSurface({
  children,
  className = "",
  intensity = 8,
  elevateOnHover = true,
}: TiltSurfaceProps) {
  const reduceMotion = useReducedMotion();
  const rotateX = useSpring(0, { stiffness: 220, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 220, damping: 20 });
  const scale = useSpring(1, { stiffness: 240, damping: 22 });
  const glareX = useTransform(rotateY, [-intensity * 2, intensity * 2], ["20%", "80%"]);
  const glareY = useTransform(rotateX, [-intensity * 2, intensity * 2], ["20%", "80%"]);
  const glareOpacity = useTransform(rotateX, [-intensity * 2, 0, intensity * 2], [0.35, 0.15, 0.35]);

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  };

  return (
    <motion.div
      className={`tilt-surface ${className}`}
      style={{
        rotateX: reduceMotion ? 0 : rotateX,
        rotateY: reduceMotion ? 0 : rotateY,
        scale: reduceMotion ? 1 : scale,
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
      }}
      onPointerMove={(event) => {
        if (reduceMotion || event.pointerType === "touch") return;
        const box = event.currentTarget.getBoundingClientRect();
        const px = (event.clientX - box.left) / box.width - 0.5;
        const py = (event.clientY - box.top) / box.height - 0.5;
        rotateX.set(-py * intensity * 2.2);
        rotateY.set(px * intensity * 2.2);
        if (elevateOnHover) scale.set(1.02);
      }}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {!reduceMotion && (
        <motion.span
          className="tilt-surface__glare"
          style={{
            left: glareX,
            top: glareY,
            opacity: glareOpacity,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
