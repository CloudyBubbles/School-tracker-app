"use client";

import { useLayoutEffect, useRef } from "react";
import { animate } from "framer-motion";
import { seenToday, markSeenToday } from "@/app/lib/utils";

const TIMES = [0, 0.22, 0.4, 0.46, 0.65, 0.85, 1];
const REVEAL_INSETS = [
  "inset(0 100% 0 0)",
  "inset(0 78% 0 0)",
  "inset(0 60% 0 0)",
  "inset(0 60% 0 0)",
  "inset(0 35% 0 0)",
  "inset(0 10% 0 0)",
  "inset(0 0% 0 0)",
];
const BLOT_LEFT = ["0%", "22%", "40%", "40%", "65%", "90%", "100%"];
const BLOT_OPACITY = [0, 0.85, 0.85, 0.85, 0.85, 0.5, 0];

interface Props {
  children: React.ReactNode;
  storageKey: string;
  inkColour: string;
}

// Animates the title as if freshly hand-written, once per calendar day
// (gated by storageKey, same reasoning as the cover ritual's session gate but
// date-keyed — see seenToday/markSeenToday). Reveal is a clip-path sweep plus
// a small travelling ink dot, not real letterform paths — good enough for a
// once-a-day grace note without font-to-path tooling.
export default function QuillTitle({ children, storageKey, inkColour }: Props) {
  const textRef = useRef<HTMLSpanElement>(null);
  const blotRef = useRef<HTMLSpanElement>(null);

  // useLayoutEffect (not useEffect) so the "already seen today" case resolves
  // before first paint — the title starts clipped in the JSX below, and this
  // either reveals it instantly (no flash) or plays the animated sweep.
  useLayoutEffect(() => {
    const text = textRef.current;
    const blot = blotRef.current;
    if (!text || !blot) return;

    if (seenToday(storageKey)) {
      text.style.clipPath = "inset(0 0% 0 0)";
      return;
    }
    markSeenToday(storageKey);

    // framer-motion's DOM keyframe types don't enumerate clipPath/left even
    // though both animate correctly at runtime (WAAPI-backed style props) —
    // cast to unblock the overload, not a real type-safety gap in our code.
    animate(
      text,
      { clipPath: REVEAL_INSETS } as Record<string, string[]>,
      { duration: 0.85, times: TIMES, ease: ["easeOut", "easeIn", "linear", "easeIn", "easeOut", "easeOut"] }
    );
    animate(
      blot,
      { left: BLOT_LEFT, opacity: BLOT_OPACITY } as Record<string, unknown>,
      { duration: 0.85, times: TIMES, ease: ["easeOut", "easeIn", "linear", "easeIn", "easeOut", "easeOut"] }
    );
  }, [storageKey]);

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span ref={textRef} style={{ display: "inline-block", clipPath: "inset(0 100% 0 0)" }}>
        {children}
      </span>
      <span
        ref={blotRef}
        style={{
          position: "absolute",
          top: "50%",
          width: "9px",
          height: "9px",
          borderRadius: "50%",
          background: inkColour,
          filter: "blur(2px)",
          transform: "translate(-50%, -50%)",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </span>
  );
}
