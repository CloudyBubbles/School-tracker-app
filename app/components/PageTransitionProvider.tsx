"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface TransitionCtx {
  isTransitioning: boolean;
  startTransition: () => void;
  endTransition: () => void;
}

const Ctx = createContext<TransitionCtx>({
  isTransitioning: false,
  startTransition: () => {},
  endTransition: () => {},
});

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const startTransition = useCallback(() => setIsTransitioning(true), []);
  const endTransition = useCallback(() => setIsTransitioning(false), []);

  return (
    <Ctx.Provider value={{ isTransitioning, startTransition, endTransition }}>
      {children}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#0e0601",
          zIndex: 100,
          pointerEvents: "none",
          opacity: isTransitioning ? 1 : 0,
          transition: "opacity 0.18s ease",
        }}
      />
    </Ctx.Provider>
  );
}

export const usePageTransition = () => useContext(Ctx);
