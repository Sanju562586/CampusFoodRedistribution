import { useId } from "react";

import { cn } from "@/lib/utils";

type BrandTone = "dark" | "light";
type WordmarkSize = "sm" | "md" | "lg";

type BrandMarkProps = {
  className?: string;
  size?: number;
};

type BrandLogoProps = BrandMarkProps & {
  showWordmark?: boolean;
  subtitle?: string;
  tone?: BrandTone;
  wordmarkSize?: WordmarkSize;
  titleClassName?: string;
  subtitleClassName?: string;
};

const toneClasses: Record<
  BrandTone,
  { campus: string; food: string; subtitle: string }
> = {
  dark: {
    campus: "text-[#163827]",
    food: "text-[#2e8f45]",
    subtitle: "text-[#58726a]",
  },
  light: {
    campus: "text-white",
    food: "text-[#dff6a3]",
    subtitle: "text-white/60",
  },
};

const wordmarkClasses: Record<
  WordmarkSize,
  { title: string; subtitle: string }
> = {
  sm: {
    title: "text-[1rem]",
    subtitle: "text-[0.52rem]",
  },
  md: {
    title: "text-[1.1rem]",
    subtitle: "text-[0.58rem]",
  },
  lg: {
    title: "text-[1.25rem]",
    subtitle: "text-[0.66rem]",
  },
};

export function BrandMark({ className, size = 40 }: BrandMarkProps) {
  const gradientId = useId().replace(/:/g, "");
  const cycleTopId = `${gradientId}-cycle-top`;
  const cycleBottomId = `${gradientId}-cycle-bottom`;
  const badgeId = `${gradientId}-badge`;
  const leafId = `${gradientId}-leaf`;

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={badgeId} x1="8" x2="56" y1="8" y2="56">
          <stop offset="0" stopColor="#184A2D" />
          <stop offset="0.55" stopColor="#24723C" />
          <stop offset="1" stopColor="#8BC34A" />
        </linearGradient>
        <linearGradient id={cycleTopId} x1="18" x2="50" y1="19" y2="21">
          <stop offset="0" stopColor="#A9E06C" />
          <stop offset="1" stopColor="#F5FFCA" />
        </linearGradient>
        <linearGradient id={cycleBottomId} x1="46" x2="14" y1="45" y2="42">
          <stop offset="0" stopColor="#FFF6D8" />
          <stop offset="1" stopColor="#B6F18F" />
        </linearGradient>
        <linearGradient id={leafId} x1="24" x2="38" y1="18" y2="34">
          <stop offset="0" stopColor="#E7FFAE" />
          <stop offset="1" stopColor="#7DD84D" />
        </linearGradient>
      </defs>

      <rect fill={`url(#${badgeId})`} height="56" rx="18" width="56" x="4" y="4" />
      <rect
        height="53"
        rx="16.5"
        stroke="#FFFFFF"
        strokeOpacity="0.14"
        width="53"
        x="5.5"
        y="5.5"
      />

      <path
        d="M17.5 23.8C20.5 17.1 27.1 12.7 34.6 13.2C40.2 13.6 45.1 16.6 48.2 21.1"
        stroke={`url(#${cycleTopId})`}
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path
        d="M44.8 16.8L50.9 18.1L47.5 23.1"
        fill="#F3FFCB"
        stroke="#F3FFCB"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />

      <path
        d="M46.5 40.2C43.5 46.9 36.9 51.3 29.4 50.8C23.8 50.4 18.9 47.4 15.8 42.9"
        stroke={`url(#${cycleBottomId})`}
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path
        d="M19.2 47.2L13.1 45.9L16.5 40.9"
        fill="#FFF1D0"
        stroke="#FFF1D0"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />

      <path
        d="M18 34.2H46V35.2C46 43.1 39.7 49.4 32 49.4C24.3 49.4 18 43.1 18 35.2V34.2Z"
        fill="#FFF4DE"
      />
      <path
        d="M20.8 34.1H43.2"
        stroke="#F4D9A6"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <path
        d="M22.8 42.4C25.3 45 28.4 46.4 32 46.4C35.6 46.4 38.7 45 41.2 42.4"
        opacity="0.9"
        stroke="#DEBC79"
        strokeLinecap="round"
        strokeWidth="2.5"
      />

      <path
        d="M33.8 16.6C27.6 17.7 22.7 23.1 22.6 29.6C29.2 29.8 34.9 25.3 36.8 19.2C37.6 16.9 36.3 16.1 33.8 16.6Z"
        fill={`url(#${leafId})`}
      />
      <path
        d="M31 22.2C31.2 27.3 29 32.3 24.7 36.9"
        stroke="#143A28"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <path
        d="M31.5 24.8C27.8 24.1 24.5 25.1 21.8 27.9C23.8 31.5 28.1 33 31.7 31.4C34 30.3 35.8 28.4 36.9 26C35.4 25.6 33.5 25.1 31.5 24.8Z"
        fill="#DAF59A"
        opacity="0.95"
      />
    </svg>
  );
}

export default function BrandLogo({
  className,
  size = 40,
  showWordmark = true,
  subtitle = "Food Rescue Network",
  tone = "dark",
  wordmarkSize = "md",
  titleClassName,
  subtitleClassName,
}: BrandLogoProps) {
  const colorSet = toneClasses[tone];
  const sizing = wordmarkClasses[wordmarkSize];

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark size={size} />

      {showWordmark ? (
        <div className="space-y-1 leading-none">
          <p
            className={cn(
              "font-[family:var(--font-headline)] font-black tracking-[-0.05em]",
              sizing.title,
              titleClassName
            )}
          >
            <span className={colorSet.campus}>Campus</span>
            <span className={colorSet.food}>Food</span>
          </p>
          <p
            className={cn(
              "font-[family:var(--font-body)] font-semibold uppercase tracking-[0.28em]",
              colorSet.subtitle,
              sizing.subtitle,
              subtitleClassName
            )}
          >
            {subtitle}
          </p>
        </div>
      ) : null}
    </div>
  );
}
