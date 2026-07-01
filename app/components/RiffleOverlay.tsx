"use client";

import { useRef, useState } from "react";
import { animate } from "framer-motion";
import { RiffleContext } from "@/app/lib/riffle-context";

const STRIP_COUNT = 3;
const STRIP_OPACITIES = [0.7, 0.85, 1.0];
const STRIP_DELAY_MS = 60;

export default function RiffleOverlay({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const stripsRef = useRef<(HTMLDivElement | null)[]>([]);
  const callbackRef = useRef<(() => void) | null>(null);

  const trigger = (onMidpoint: () => void) => {
    callbackRef.current = onMidpoint;
    setActive(true);

    stripsRef.current.forEach((el, i) => {
      if (!el) return;
      el.style.transform = "translateX(-100%)";
      el.style.opacity = String(STRIP_OPACITIES[i]);

      setTimeout(() => {
        animate(
          el,
          { transform: ["translateX(-100%)", "translateX(0%)", "translateX(100%)"] },
          {
            duration: 0.22,
            ease: "easeInOut",
            onComplete: () => {
              if (i === 1 && callbackRef.current) {
                callbackRef.current();
                callbackRef.current = null;
              }
              if (i === STRIP_COUNT - 1) {
                setActive(false);
              }
            },
          }
        );
      }, i * STRIP_DELAY_MS);
    });
  };

  return (
    <RiffleContext.Provider value={{ trigger }}>
      {children}
      {Array.from({ length: STRIP_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { stripsRef.current[i] = el; }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundImage: `linear-gradient(
              to right,
              var(--parchment-dark) 0%,
              var(--parchment) 4%,
              var(--parchment) 96%,
              var(--parchment-dark) 100%
            )`,
            transform: "translateX(-100%)",
            pointerEvents: active ? "all" : "none",
          }}
        />
      ))}
    </RiffleContext.Provider>
  );
}
