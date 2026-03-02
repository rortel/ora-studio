import { motion } from "motion/react";

const targets = [
  { label: "Text", angle: -90 },
  { label: "Image", angle: -30 },
  { label: "Video", angle: 30 },
  { label: "Code", angle: 90 },
  { label: "Arena", angle: 150 },
  { label: "Brand Vault", angle: 210 },
];

export function PulseRadar() {
  const size = 600;
  const cx = size / 2;
  const cy = size / 2;
  const rings = [60, 100, 140, 180, 220, 260];
  const targetRadius = 240;
  const dotRadius = 280;

  return (
    <section className="py-12 md:py-20 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 flex justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
          style={{ width: size, height: size }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            fill="none"
            className="w-full h-full max-w-full"
          >
            {/* Concentric rings */}
            {rings.map((r, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                stroke="var(--ora-signal)"
                strokeWidth={0.5}
                opacity={0.15 + (i * 0.04)}
              />
            ))}

            {/* Radial lines to each target */}
            {targets.map((t, i) => {
              const rad = (t.angle * Math.PI) / 180;
              const x2 = cx + dotRadius * Math.cos(rad);
              const y2 = cy + dotRadius * Math.sin(rad);
              return (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={x2}
                  y2={y2}
                  stroke="var(--border-strong)"
                  strokeWidth={0.5}
                  strokeDasharray="4 4"
                  opacity={0.5}
                />
              );
            })}

            {/* Center dot */}
            <circle cx={cx} cy={cy} r={3} fill="var(--ora-signal)" />

            {/* Animated pulse from center */}
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={`pulse-${i}`}
                cx={cx}
                cy={cy}
                r={0}
                stroke="var(--ora-signal)"
                strokeWidth={0.5}
                fill="none"
                animate={{
                  r: [0, 260],
                  opacity: [0.3, 0],
                }}
                transition={{
                  duration: 4,
                  delay: i * 1.3,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}

            {/* Outer target dots (circle icons) */}
            {targets.map((t, i) => {
              const rad = (t.angle * Math.PI) / 180;
              const dx = cx + dotRadius * Math.cos(rad);
              const dy = cy + dotRadius * Math.sin(rad);
              return (
                <g key={`dot-${i}`}>
                  <circle cx={dx} cy={dy} r={10} fill="white" stroke="var(--ora-signal)" strokeWidth={1} opacity={0.6} />
                  <circle cx={dx} cy={dy} r={3} fill="var(--ora-signal)" opacity={0.6} />
                </g>
              );
            })}
          </svg>

          {/* Format labels positioned outside svg via absolute positioning */}
          {targets.map((t) => {
            const rad = (t.angle * Math.PI) / 180;
            const labelR = targetRadius * 0.82;
            const lx = 50 + (labelR / (size / 2)) * 50 * Math.cos(rad);
            const ly = 50 + (labelR / (size / 2)) * 50 * Math.sin(rad);
            return (
              <div
                key={t.label}
                className="absolute text-muted-foreground"
                style={{
                  left: `${lx}%`,
                  top: `${ly}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: '14px',
                  fontWeight: 400,
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
