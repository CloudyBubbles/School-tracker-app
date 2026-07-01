# Session 17 — Go Ham: Candlelight Mode, Pomodoro Timer, Keyboard Shortcuts

You are working on a personal schoolwork tracker. Next.js 16 (App Router) + TypeScript +
Tailwind CSS 4. Warm leather journal aesthetic. localStorage-only — no backend.

## Aesthetic reference
CSS vars in globals.css: `--parchment` (#f4ead5), `--parchment-dark`, `--parchment-edge`,
`--ink-dark` (#2c1810), `--ink-medium` (#5c3d20), `--ink-light` (#8a6040),
`--gold` (#c8a050), `--font-serif`, `--font-display`, `--font-hand`

`ParchmentPage` component uses `background: "var(--parchment)"` as an inline style.
It also has `className="journal-page"`.

## Current layout.tsx structure
```tsx
<html lang="en" className="h-full" style={{ colorScheme: "light" }}>
  <head>
    {/* Google Fonts */}
  </head>
  <body className="min-h-full flex flex-col">
    <div style={{ perspective: "1200px", perspectiveOrigin: "center center" }}>
      <PageTransitionProvider>
        {children}
      </PageTransitionProvider>
    </div>
  </body>
</html>
```

---

## Session 17 — Three tasks

---

### Task 1 — Candlelight mode

A theme toggle that shifts all parchment pages from cool cream to warm amber. Persists to
localStorage. No flash on load.

**Step A — `app/globals.css`**

Add below the existing `:root` block:

```css
/* Candlelight mode — warmer amber palette */
html.candlelight {
  --parchment: #e8d5a0;
  --parchment-dark: #ddc88a;
  --parchment-edge: #cdb870;
  --ink-dark: #1e0e04;
  --ink-medium: #4a2808;
  --ink-light: #7a4a20;
  --gold: #c8a040;
}

/* Subtle candle-flicker on parchment pages */
html.candlelight .journal-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(180, 90, 0, 0.035);
  pointer-events: none;
  animation: candle-flicker 5s ease-in-out infinite;
  z-index: 1;
}

@keyframes candle-flicker {
  0%,100% { opacity: 0.6; }
  20%     { opacity: 1; }
  45%     { opacity: 0.4; }
  70%     { opacity: 0.9; }
  85%     { opacity: 0.5; }
}
```

NOTE: `ParchmentPage` already has `position: relative` and `overflow: hidden` and its
main content div is at `z-index: 10`, so the `::before` overlay at `z-index: 1` sits
above the background but below all content.

**Step B — `app/layout.tsx`**

Add an inline script to `<head>` (before the Google Fonts links) that sets the class
synchronously on page load to prevent flash:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `try{if(localStorage.getItem('candlelight')==='true')document.documentElement.classList.add('candlelight')}catch(e){}`,
  }}
/>
```

Also import and render `PomodoroTimer` (from Task 2) inside the layout body, as a sibling
to the perspective wrapper:

```tsx
<body className="min-h-full flex flex-col">
  <div style={{ perspective: "1200px", perspectiveOrigin: "center center" }}>
    <PageTransitionProvider>
      {children}
    </PageTransitionProvider>
  </div>
  <PomodoroTimer />
</body>
```

**Step C — Candlelight toggle utility**

This logic is identical in every place the toggle appears. Define it once locally in each
component (it's 3 lines, not worth extracting):

```ts
const [candlelight, setCandlelight] = useState(false);

useEffect(() => {
  setCandlelight(document.documentElement.classList.contains("candlelight"));
}, []);

const toggleCandlelight = () => {
  const next = !document.documentElement.classList.contains("candlelight");
  document.documentElement.classList.toggle("candlelight", next);
  try { localStorage.setItem("candlelight", String(next)); } catch { /* */ }
  setCandlelight(next);
};
```

**Step D — Toggle button on the Today page (`app/journal/page.tsx`)**

In the Today page masthead area, near the date heading, add a small toggle button. Place
it as an absolutely-positioned button in the top-right of the masthead section, or as a
floating element. Suggested placement — just above the horizontal rule divider that
separates the header from the assignment list:

```tsx
<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
  <button
    onClick={toggleCandlelight}
    title={candlelight ? "Switch to daylight" : "Switch to candlelight"}
    style={{
      background: "transparent",
      border: "none",
      cursor: "pointer",
      fontSize: "15px",
      opacity: candlelight ? 0.9 : 0.4,
      padding: "0 2px",
      transition: "opacity 0.2s",
    }}
  >
    🕯
  </button>
</div>
```

**Step E — Toggle on the cover page (`app/page.tsx`)**

Add the same `candlelight` state + `toggleCandlelight` function. Place the toggle button
in the utility links section (below "backup / restore"), styled to match:

```tsx
<div style={{ textAlign: "center", marginTop: "8px" }}>
  <button
    onClick={toggleCandlelight}
    style={{
      background: "transparent",
      border: "none",
      fontFamily: "var(--font-hand)",
      fontSize: "10px",
      color: "rgba(200,160,80,0.4)",
      cursor: "pointer",
      padding: 0,
    }}
  >
    {candlelight ? "🕯 daylight" : "🕯 candlelight"}
  </button>
</div>
```

---

### Task 2 — Floating Pomodoro timer

**`app/components/journal/PomodoroTimer.tsx`** — CREATE new file.

This is a `"use client"` component, rendered in layout so it persists timer state
across page navigations. It hides itself on the cover page (`pathname === "/"`).

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
```

**State:**
```ts
const [open, setOpen] = useState(false);
const totalRef = useRef(25 * 60); // total seconds remaining
const [display, setDisplay] = useState({ m: 25, s: 0 });
const [running, setRunning] = useState(false);
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

**Bell sound** (Web Audio API, no files needed):
```ts
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
```

**Timer tick (useEffect on `running`):**
```ts
useEffect(() => {
  if (!running) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    return;
  }
  const id = setInterval(() => {
    totalRef.current -= 1;
    if (totalRef.current <= 0) {
      totalRef.current = 0;
      setDisplay({ m: 0, s: 0 });
      setRunning(false);
      playBell();
    } else {
      setDisplay({
        m: Math.floor(totalRef.current / 60),
        s: totalRef.current % 60,
      });
    }
  }, 1000);
  intervalRef.current = id;
  return () => clearInterval(id);
}, [running]);
```

**Preset handler:**
```ts
const setPreset = (mins: number) => {
  setRunning(false);
  totalRef.current = mins * 60;
  setDisplay({ m: mins, s: 0 });
};

const handleReset = () => {
  setRunning(false);
  // Reset to whatever the display currently shows rounded to preset
  const currentMins = display.m + (display.s > 0 ? 1 : 0);
  const snappedMins = [5, 10, 25].reduce((a, b) =>
    Math.abs(b - currentMins) < Math.abs(a - currentMins) ? b : a
  );
  setPreset(snappedMins);
};
```

**Hide on cover:**
```ts
const pathname = usePathname();
if (pathname === "/") return null;
```

**Visual design:**

Position: `fixed, bottom: 24px, left: 24px, zIndex: 20`

Collapsed state — just a small round parchment button showing the timer (so you can see
countdown even when collapsed):
```tsx
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
```

Expanded state — a small parchment card:
```
┌──────────────────────────────┐
│  ⏱  Focus Session        [×] │   ← header with close button
│                              │
│       25:00                  │   ← Playfair Display, 44px
│                              │
│   [25 min] [10 min] [5 min]  │   ← preset pills
│                              │
│     [▶ Start]   [↺ Reset]   │   ← controls
└──────────────────────────────┘
```

Card styles:
- `background: var(--parchment)`
- `border: 1px solid rgba(140,100,60,0.2)`
- `borderRadius: "6px"`
- `boxShadow: "0 4px 16px rgba(0,0,0,0.15)"`
- `padding: "16px 20px"`
- `width: "220px"`

Timer display: `fontFamily: "var(--font-display)", fontSize: "44px", color: "var(--ink-medium)", textAlign: "center", letterSpacing: "0.04em"`.
When running, add a subtle pulse: `animation: timer-pulse 1s ease-in-out infinite` (just a barely-there opacity shift).

Add to globals.css:
```css
@keyframes timer-pulse {
  0%,100% { opacity: 1; }
  50%     { opacity: 0.85; }
}
```

Header label: `fontFamily: "var(--font-hand)", fontSize: "11px", color: "var(--ink-light)"` — shows "Focus Session".

Preset pills: small buttons with `fontFamily: "var(--font-hand)", fontSize: "10px"`. Active preset (matching current time) gets slightly darker background.

Start/Pause button: `fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "12px"`. Shows "▶ start" / "⏸ pause". Background: `rgba(140,100,60,0.1)`, border: `1px solid rgba(140,100,60,0.2)`.

Reset button: same style, shows "↺ reset".

When time is up (display.m === 0 && display.s === 0 && !running): show a brief "Time's up!" message in `var(--font-hand)` instead of the start button.

---

### Task 3 — Keyboard shortcuts

**Today page (`app/journal/page.tsx`):**

1. Add a `searchInputRef = useRef<HTMLInputElement>(null)` near the other refs.

2. Attach the ref to the search input element: add `ref={searchInputRef}` to the search
   `<input>` in the JSX.

3. Add a `useEffect` that registers global keyboard shortcuts for this page. Place it
   near the other `useEffect` hooks:

```ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
    if (e.key === "q" || e.key === "Q") {
      e.preventDefault();
      setShowQuickAdd((v) => !v);
    }
    if (e.key === "/") {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    if (e.key === "Escape") {
      setShowQuickAdd(false);
      setSearchQuery("");
      searchInputRef.current?.blur();
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

4. Add a small shortcut hint below the search bar — a single line in `var(--font-hand)`
   at 9px, `color: var(--ink-light)`, `opacity: 0.5`:
```tsx
<div style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", opacity: 0.5, marginTop: "3px", textAlign: "right" }}>
  q — add · / — search · esc — close
</div>
```

**Chapter page (`app/journal/[subject]/page.tsx`):**

Add a similar `useEffect` near the other hooks:

```ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
    if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      setShowForm((v) => !v);
    }
    if (e.key === "Escape") {
      setShowForm(false);
      setEditingId(null);
      setDeleteConfirmId(null);
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

Add a shortcut hint near the "add assignment" button on the chapter page:
```tsx
<span style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", opacity: 0.45, marginLeft: "8px" }}>
  a — add · esc — close
</span>
```

---

## Files to touch

1. `app/globals.css` — candlelight CSS vars + flicker + timer-pulse keyframes
2. `app/layout.tsx` — inline no-flash script + PomodoroTimer import + render
3. `app/components/journal/PomodoroTimer.tsx` — CREATE new file
4. `app/journal/page.tsx` — candlelight toggle + keyboard shortcuts
5. `app/page.tsx` — candlelight toggle on cover
6. `app/journal/[subject]/page.tsx` — keyboard shortcuts

## Constraints

- No new npm packages — Web Audio API only for bell sound
- All timer state lives in the component (in layout, so it persists across navigations)
- The `::before` flicker overlay must not block clicks (pointer-events: none)
- PomodoroTimer returns null on `pathname === "/"` (the cover page)
- `"use client"` required on PomodoroTimer since it uses hooks + browser APIs
- layout.tsx is a Server Component — it CAN import PomodoroTimer since that component
  has its own `"use client"` directive
