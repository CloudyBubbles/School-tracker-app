# Session 20a — Page Riffle (Chapter Navigation)

## What this is

When you click a subject tab to switch chapters, 3 parchment-coloured strips
sequence across the screen left-to-right in rapid succession — like physically
flicking through pages to find your section — then the new chapter settles in.
Total duration: ~260ms. Fast enough to not slow you down, striking enough to
notice every time.

## How it works

A `RiffleOverlay` component lives in `app/layout.tsx` (always mounted, invisible
by default). It exposes a `triggerRiffle(callback)` function via React context.
When a chapter tab is clicked, `handleChapterNav` calls `triggerRiffle` instead
of navigating directly. The overlay plays the animation, then the callback fires
(which does `router.push`).

## Step 1 — Context + hook

New file: `app/lib/riffle-context.tsx`

```tsx
"use client";

import { createContext, useContext, useRef } from "react";

type RiffleFn = (onMidpoint: () => void) => void;

const RiffleContext = createContext<{ trigger: RiffleFn }>({
  trigger: (cb) => cb(), // fallback: just run callback immediately
});

export function useRiffle() {
  return useContext(RiffleContext);
}

export { RiffleContext };
```

## Step 2 — RiffleOverlay component

New file: `app/components/RiffleOverlay.tsx`

```tsx
"use client";

import { useRef, useState } from "react";
import { animate } from "framer-motion";
import { RiffleContext } from "@/app/lib/riffle-context";

const STRIP_COUNT = 3;
// Each strip is slightly different — layered depth effect
const STRIP_OPACITIES = [0.7, 0.85, 1.0];
const STRIP_DELAY_MS = 60; // stagger between strips

export default function RiffleOverlay({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const stripsRef = useRef<(HTMLDivElement | null)[]>([]);
  const callbackRef = useRef<(() => void) | null>(null);

  const trigger = (onMidpoint: () => void) => {
    callbackRef.current = onMidpoint;
    setActive(true);

    // Animate each strip left-to-right in sequence
    stripsRef.current.forEach((el, i) => {
      if (!el) return;
      // Reset to start position
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
              // Fire the navigation callback after the SECOND strip clears
              // (third strip is still crossing — gives a seamless feel)
              if (i === 1 && callbackRef.current) {
                callbackRef.current();
                callbackRef.current = null;
              }
              // Clean up after last strip
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
      {/* Strips — rendered outside the page flow, pointer-events: none while idle */}
      {Array.from({ length: STRIP_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { stripsRef.current[i] = el; }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: `var(--parchment)`,
            // Subtle paper-edge gradient on the leading edge
            backgroundImage: `linear-gradient(
              to right,
              var(--parchment-dark) 0%,
              var(--parchment) 4%,
              var(--parchment) 96%,
              var(--parchment-dark) 100%
            )`,
            transform: "translateX(-100%)", // hidden off-left initially
            pointerEvents: active ? "all" : "none",
          }}
        />
      ))}
    </RiffleContext.Provider>
  );
}
```

## Step 3 — Wire into layout.tsx

In `app/layout.tsx`:

```tsx
import RiffleOverlay from "@/app/components/RiffleOverlay";

// Wrap PageTransitionProvider with RiffleOverlay:
<div style={{ perspective: "1200px", perspectiveOrigin: "center center" }}>
  <RiffleOverlay>
    <PageTransitionProvider>
      {children}
    </PageTransitionProvider>
  </RiffleOverlay>
</div>
```

## Step 4 — Use in chapter page

In `app/journal/[subject]/page.tsx`:

```tsx
import { useRiffle } from "@/app/lib/riffle-context";

// Inside the component:
const { trigger: triggerRiffle } = useRiffle();

// Replace handleChapterNav:
const handleChapterNav = async (href: string) => {
  if (flipping) return;
  setFlipping(true);
  triggerRiffle(() => router.push(href));
  // Reset flipping after the animation window
  setTimeout(() => setFlipping(false), 400);
};
```

Remove the old `animate(pageRef.current, ...)` call that was in `handleChapterNav`
(it's been replaced by the riffle).

## Files to touch

| File | Change |
|---|---|
| `app/lib/riffle-context.tsx` | NEW — context + hook |
| `app/components/RiffleOverlay.tsx` | NEW — overlay + provider |
| `app/layout.tsx` | Wrap children in RiffleOverlay |
| `app/journal/[subject]/page.tsx` | Import useRiffle, replace handleChapterNav body |

## Quality bar

- [ ] Clicking a chapter tab: 3 parchment strips sequence across the screen, new chapter appears
- [ ] Strips are fast enough to not feel sluggish (~260ms total)
- [ ] Navigation fires correctly — no missed or double navigations
- [ ] Rapid clicking doesn't break anything (the `flipping` guard handles this)
- [ ] TypeScript clean — `tsc --noEmit` zero errors
- [ ] Works in candlelight mode (strips use CSS vars, so they auto-adjust)
