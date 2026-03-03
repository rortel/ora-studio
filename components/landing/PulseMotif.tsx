"use client";

import { motion } from "motion/react";

interface PulseMotifProps {
  size?: number;
  rings?: number;
  className?: string;
  animate?: boolean;
  strokeColor?: string;
}

export function PulseMotif({
  size = 320,
  rings = 5,
  className = "",
  animate = true,
  strokeColor = "var(--ora-signal)",
}: PulseMotifProps) {
  const center = size / 2;
  const maxRadius = size / 2 - 4;
  const spacing = maxRadius / (rings + 1);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      fill="none"
    >
      <circle cx={center} cy={center} r={2.5} fill={strokeColor} />
      {Array.from({ length: rings }).map((_, i) => {
        const radius = spacing * (i + 1);
        const opacity = 1 - i * (0.7 / rings);
        return (
          <motion.circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            stroke={strokeColor}
            strokeWidth={0.5}
            opacity={0}
            initial={animate ? { r: 0, opacity: 0 } : { r: radius, opacity: opacity * 0.5 }}
            animate={
              animate
                ? {
                    r: [0, radius, radius],
                    opacity: [0, opacity * 0.6, 0],
                  }
                : undefined
            }
            transition={
              animate
                ? {
                    duration: 3,
                    delay: i * 0.4,
                    repeat: Infinity,
                    repeatDelay: 1.5,
                    ease: "easeOut",
                  }
                : undefined
            }
          />
        );
      })}
    </svg>
  );
}

export function PulseIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" className={className}>
      <circle cx={c} cy={c} r={1.5} fill="var(--ora-signal)" />
      <circle cx={c} cy={c} r={c * 0.4} stroke="var(--ora-signal)" strokeWidth={0.5} opacity={0.5} />
      <circle cx={c} cy={c} r={c * 0.7} stroke="var(--ora-signal)" strokeWidth={0.5} opacity={0.3} />
      <circle cx={c} cy={c} r={c * 0.95} stroke="var(--ora-signal)" strokeWidth={0.5} opacity={0.15} />
    </svg>
  );
}
