"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { usePomodoro, LinkedTask } from "@/app/lib/pomodoro-context";
import { logFocusMinutes } from "@/app/lib/db/assignments";

function playBell() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
    osc.start();
    osc.stop(ctx.currentTime + 2.5);
    setTimeout(() => ctx.close(), 3000);
  } catch { /* AudioContext not supported */ }
}

export default function PomodoroTimer() {
  const pathname = usePathname();
  const { linkedTask, clearLinkedTask } = usePomodoro();
  const [open, setOpen] = useState(false);
  const totalRef = useRef(25 * 60);
  const [display, setDisplay] = useState({ m: 25, s: 0 });
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Real running-time accumulator, not "preset − remaining" — stays accurate
  // even if the preset buttons get clicked mid-session (remaining resets,
  // this doesn't). Read via a ref inside logAndClear so a stale interval
  // closure can't log against the wrong (already-switched-away-from) task.
  const elapsedSecondsRef = useRef(0);
  const linkedTaskRef = useRef<LinkedTask | null>(null);
  const prevLinkedTaskRef = useRef<LinkedTask | null>(null);
  useEffect(() => { linkedTaskRef.current = linkedTask; }, [linkedTask]);

  // Stable across renders (only depends on the already-stable clearLinkedTask)
  // so it's safe to include in the tick interval's deps below without that
  // effect tearing down and recreating the interval on every render/tick.
  const logAndClear = useCallback(() => {
    const task = linkedTaskRef.current;
    if (task && elapsedSecondsRef.current > 0) {
      void logFocusMinutes(task.id, Math.round(elapsedSecondsRef.current / 60)).catch(() => {});
    }
    elapsedSecondsRef.current = 0;
    if (task) clearLinkedTask();
  }, [clearLinkedTask]);

  // A new task got linked (first link, or switching from a different one
  // mid-session). If a different task was linked and had elapsed time,
  // log its partial time before resetting for the new one — so focus time
  // never silently vanishes when jumping straight from card to card.
  useEffect(() => {
    const prev = prevLinkedTaskRef.current;
    if (linkedTask && linkedTask.id !== prev?.id) {
      if (prev && elapsedSecondsRef.current > 0) {
        void logFocusMinutes(prev.id, Math.round(elapsedSecondsRef.current / 60)).catch(() => {});
      }
      elapsedSecondsRef.current = 0;
      totalRef.current = 25 * 60;
      setDisplay({ m: 25, s: 0 });
      setOpen(true);
      setRunning(true);
    }
    prevLinkedTaskRef.current = linkedTask;
  }, [linkedTask]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const id = setInterval(() => {
      totalRef.current -= 1;
      elapsedSecondsRef.current += 1;
      if (totalRef.current <= 0) {
        totalRef.current = 0;
        setDisplay({ m: 0, s: 0 });
        setRunning(false);
        playBell();
        logAndClear();
      } else {
        setDisplay({
          m: Math.floor(totalRef.current / 60),
          s: totalRef.current % 60,
        });
      }
    }, 1000);
    intervalRef.current = id;
    return () => clearInterval(id);
  }, [running, logAndClear]);

  const setPreset = (mins: number) => {
    setRunning(false);
    totalRef.current = mins * 60;
    setDisplay({ m: mins, s: 0 });
  };

  const handleReset = () => {
    logAndClear();
    setRunning(false);
    const currentMins = totalRef.current / 60;
    const snappedMins = currentMins === 0
      ? 25
      : [5, 10, 25].reduce((a, b) =>
          Math.abs(b - currentMins) < Math.abs(a - currentMins) ? b : a
        );
    setPreset(snappedMins);
  };

  if (pathname === "/") return null;

  const timeUp = display.m === 0 && display.s === 0 && !running;

  const pillStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "24px",
    left: "24px",
    zIndex: 20,
  };

  const presetBtnStyle = (mins: number): React.CSSProperties => {
    const isActive = display.m === mins && display.s === 0;
    return {
      background: isActive ? "rgba(140,100,60,0.18)" : "rgba(140,100,60,0.08)",
      border: "1px solid rgba(140,100,60,0.2)",
      borderRadius: "10px",
      padding: "3px 9px",
      fontFamily: "var(--font-hand)",
      fontSize: "10px",
      color: "var(--ink-medium)",
      cursor: "pointer",
    };
  };

  const actionBtnStyle: React.CSSProperties = {
    background: "rgba(140,100,60,0.1)",
    border: "1px solid rgba(140,100,60,0.2)",
    borderRadius: "4px",
    padding: "5px 14px",
    fontFamily: "var(--font-serif)",
    fontStyle: "italic",
    fontSize: "12px",
    color: "var(--ink-medium)",
    cursor: "pointer",
  };

  if (!open) {
    return (
      <div style={pillStyle}>
        <button
          onClick={() => setOpen(true)}
          style={{
            background: "var(--parchment)",
            border: "1px solid rgba(140,100,60,0.25)",
            borderRadius: "20px",
            padding: "6px 12px",
            fontFamily: "var(--font-display)",
            fontSize: "13px",
            color: running ? "var(--ink-medium)" : "var(--ink-light)",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            letterSpacing: "0.02em",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "11px" }}>⏱</span>
          {String(display.m).padStart(2, "0")}:{String(display.s).padStart(2, "0")}
        </button>
      </div>
    );
  }

  return (
    <div style={pillStyle}>
      <div
        style={{
          background: "var(--parchment)",
          border: "1px solid rgba(140,100,60,0.2)",
          borderRadius: "6px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          padding: "16px 20px",
          width: "220px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: "11px",
              color: "var(--ink-light)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={linkedTask ? `Focusing: ${linkedTask.title}` : undefined}
          >
            {linkedTask ? `Focusing: ${linkedTask.title}` : "⏱ Focus Session"}
          </span>
          <button
            onClick={() => { logAndClear(); setRunning(false); setOpen(false); }}
            style={{
              background: "transparent",
              border: "none",
              fontFamily: "var(--font-serif)",
              fontSize: "14px",
              color: "var(--ink-light)",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Timer display */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "44px",
            color: "var(--ink-medium)",
            textAlign: "center",
            letterSpacing: "0.04em",
            lineHeight: 1,
            marginBottom: "14px",
            animation: running ? "timer-pulse 1s ease-in-out infinite" : "none",
          }}
        >
          {String(display.m).padStart(2, "0")}:{String(display.s).padStart(2, "0")}
        </div>

        {/* Preset pills */}
        <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "14px" }}>
          {[25, 10, 5].map((mins) => (
            <button key={mins} onClick={() => setPreset(mins)} style={presetBtnStyle(mins)}>
              {mins} min
            </button>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {timeUp ? (
            <span style={{ fontFamily: "var(--font-hand)", fontSize: "12px", color: "var(--ink-medium)" }}>
              Time&apos;s up!
            </span>
          ) : (
            <button onClick={() => setRunning((v) => !v)} style={actionBtnStyle}>
              {running ? "⏸ pause" : "▶ start"}
            </button>
          )}
          <button onClick={handleReset} style={actionBtnStyle}>
            ↺ reset
          </button>
        </div>
      </div>
    </div>
  );
}
