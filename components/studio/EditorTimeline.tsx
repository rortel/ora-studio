"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useRef } from "react";
import { Play, Pause, SkipBack } from "lucide-react";

interface Track {
  id: string;
  label: string;
  color: string;
  keyframes: number[]; // positions in seconds
}

const DEFAULT_TRACKS: Track[] = [
  { id: "t-bg",       label: "Background",  color: "#6b6b7b", keyframes: [0, 2] },
  { id: "t-visual",   label: "Visual",      color: "#3b4fc4", keyframes: [0.3, 1.5, 3] },
  { id: "t-headline", label: "Headline",    color: "#111113", keyframes: [0.6, 2.5] },
  { id: "t-cta",      label: "CTA",         color: "#22c55e", keyframes: [1.2, 3] },
];

const DURATION = 4; // seconds
const MARKS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];

interface Props {
  visible: boolean;
}

export function EditorTimeline({ visible }: Props) {
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0); // 0..1
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startPlayheadRef = useRef<number>(0);

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      setPlaying(true);
      startTimeRef.current = performance.now();
      startPlayheadRef.current = playhead;
      const tick = () => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        const next = startPlayheadRef.current + elapsed / DURATION;
        if (next >= 1) {
          setPlayhead(1);
          setPlaying(false);
        } else {
          setPlayhead(next);
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  function handleRewind() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setPlayhead(0);
  }

  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rel = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setPlayhead(rel);
    startPlayheadRef.current = rel;
    startTimeRef.current = performance.now();
  }

  const currentTime = (playhead * DURATION).toFixed(1);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 140, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 overflow-hidden border-t"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <div className="flex h-full">
            {/* Left: transport + track labels */}
            <div
              className="w-28 flex-shrink-0 border-r flex flex-col"
              style={{ borderColor: "var(--border)" }}
            >
              {/* Transport controls */}
              <div
                className="flex items-center gap-1 px-2 py-1.5 border-b flex-shrink-0"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  onClick={handleRewind}
                  className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <SkipBack size={11} />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {playing ? <Pause size={11} /> : <Play size={11} />}
                </button>
                <span
                  style={{ fontSize: "9px", color: "var(--muted-foreground)", fontFamily: "monospace", marginLeft: 4 }}
                >
                  {currentTime}s
                </span>
              </div>

              {/* Track labels */}
              {DEFAULT_TRACKS.map((track) => (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrack(track.id === selectedTrack ? null : track.id)}
                  className="flex items-center gap-1.5 px-2 py-1 cursor-pointer transition-colors hover:bg-secondary/50"
                  style={{
                    height: 24,
                    background: selectedTrack === track.id ? "var(--secondary)" : "transparent",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ background: track.color }}
                  />
                  <span
                    style={{ fontSize: "9px", color: "var(--foreground)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                  >
                    {track.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Right: timeline ruler + tracks */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Ruler */}
              <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                className="relative flex-shrink-0 cursor-pointer"
                style={{ height: 24, borderBottom: "1px solid var(--border)", background: "var(--secondary)/50" }}
              >
                {MARKS.map((t) => (
                  <div
                    key={t}
                    className="absolute top-0 bottom-0 flex flex-col items-center"
                    style={{ left: `${(t / DURATION) * 100}%` }}
                  >
                    <div style={{ width: 1, height: 8, background: "var(--border)", marginTop: 0 }} />
                    <span style={{ fontSize: "8px", color: "var(--muted-foreground)", marginTop: 1 }}>
                      {t > 0 ? `${t}s` : ""}
                    </span>
                  </div>
                ))}
                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 z-10 pointer-events-none"
                  style={{ left: `${playhead * 100}%`, width: 1, background: "var(--ora-signal)" }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: -4,
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: "var(--ora-signal)",
                    }}
                  />
                </div>
              </div>

              {/* Tracks */}
              {DEFAULT_TRACKS.map((track) => (
                <div
                  key={track.id}
                  className="relative"
                  style={{
                    height: 24,
                    borderBottom: "1px solid var(--border)",
                    background: selectedTrack === track.id ? "var(--ora-signal-light)" : "transparent",
                  }}
                >
                  {/* Bar */}
                  <div
                    className="absolute rounded"
                    style={{
                      left: `${(track.keyframes[0] / DURATION) * 100}%`,
                      width: `${((track.keyframes[track.keyframes.length - 1] - track.keyframes[0]) / DURATION) * 100}%`,
                      top: 6,
                      height: 12,
                      background: track.color,
                      opacity: 0.25,
                    }}
                  />
                  {/* Keyframes */}
                  {track.keyframes.map((kf, i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${(kf / DURATION) * 100}%`,
                        top: 8,
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: track.color,
                        transform: "translateX(-4px) rotate(45deg)",
                        cursor: "pointer",
                      }}
                      title={`Keyframe at ${kf}s`}
                    />
                  ))}
                  {/* Playhead overlay */}
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none"
                    style={{ left: `${playhead * 100}%`, width: 1, background: "var(--ora-signal)", opacity: 0.5 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
