# Session 21 — 3D Book Cover

## What this builds

The cover page becomes a physical book. Two layers stacked on the same position:

- **Front cover (leather, rotates)** — dark leather exterior, embossed gold title. Starts closed. Auto-opens on page load. Snaps shut when you click "Open Journal →".
- **Interior (parchment, static)** — all current cover content lives here. Revealed as the cover swings open.

Sequence on page load:
1. Closed leather book appears
2. 300ms pause
3. Cover swings open on left-spine hinge (rotateY: 0 → -160°, 700ms)
4. Parchment interior visible — stats, chapters, buttons

Sequence on "Open Journal →":
1. Cover snaps shut (rotateY: -160 → 0, 350ms)
2. Dark overlay fades in
3. Navigate to Today page

---

## The 3D cover structure

The front cover is a `motion.div` with two absolute child faces — outer (leather) and inner (endpaper) — using `backfaceVisibility: hidden` so each face only shows when it's facing the camera.

```
motion.div  [rotates: 0° closed → -160° open]  transformStyle: preserve-3d
├── outer face div  [backfaceVisibility: hidden]  — visible when 0° to -90°
│   └── SCHOOLWORK title, year, corner ornaments, inner frame
└── inner face div  [transform: rotateY(180deg)]  [backfaceVisibility: hidden]
    └── dark endpaper — visible when cover is past -90° (open)
```

The `perspective: 1200px` on the layout wrapper already provides depth — do NOT add a second `perspective` anywhere inside the cover page, it compounds and distorts.

---

## Part 1 — Import changes

In `app/page.tsx`:

**Before:**
```tsx
import { useEffect, useState } from "react";
import { motion, useAnimate } from "framer-motion";
```

**After:**
```tsx
import { useEffect, useRef, useState } from "react";
import { motion, animate } from "framer-motion";
```

Also add the sound import if not already present:
```tsx
import { playBookOpen } from "@/app/lib/sounds";
```

---

## Part 2 — State and refs

**Remove:**
```tsx
const [scope, animate] = useAnimate();
```

**Add:**
```tsx
const coverRef = useRef<HTMLDivElement>(null);
const [animating, setAnimating] = useState(false);
```

Keep all existing state (`subjects`, `stats`, `showManageSubjects`, `showBackup`, `sounds`, `candlelight`, `subjectCounts`, `urgentSubjects`, `removeWarning`, `importError`, `newSubjectName`, `newSubjectColour`) exactly as-is.

---

## Part 3 — Animation functions

Replace `handleOpen` with three new functions:

```tsx
const openCover = async () => {
  if (animating || !coverRef.current) return;
  setAnimating(true);
  // Read sounds from the class list — more reliable than state at mount time
  if (document.documentElement.classList.contains("sounds-on")) playBookOpen();
  await animate(
    coverRef.current,
    { rotateY: -160 },
    { duration: 0.7, ease: [0.3, 0, 0.3, 1] }
  );
  setAnimating(false);
};

const closeCover = async () => {
  if (!coverRef.current) return;
  await animate(
    coverRef.current,
    { rotateY: 0 },
    { duration: 0.35, ease: [0.6, 0, 0.8, 1] }
  );
};

const handleOpen = async () => {
  if (animating) return;
  setAnimating(true);
  await closeCover();
  startTransition();
  router.push("/journal");
  // No setAnimating(false) — page navigates away
};
```

**Easing breakdown:**
- Open `[0.3, 0, 0.3, 1]` — starts slow (leather is heavy), smooth arc. At 700ms it feels real.
- Close `[0.6, 0, 0.8, 1]` — snaps shut. Fast and decisive at 350ms.

---

## Part 4 — Mount useEffect

Replace:
```tsx
useEffect(() => { endTransition(); }, [endTransition]);
```

With:
```tsx
useEffect(() => {
  endTransition();
  const t = setTimeout(() => { openCover(); }, 300);
  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

The 300ms gap lets the page fully render before the animation fires. The cleanup cancels the timeout if the component unmounts before it fires.

---

## Part 5 — JSX restructure

This is the main change. The entire `return` block in `app/page.tsx` becomes the structure below.

**The interior content is everything that was inside the old `motion.div` — copy it verbatim, but update the colors (see color table below the JSX).**

```tsx
return (
  <div
    style={{
      minHeight: "100vh",
      background: "linear-gradient(#1a0c04, #0e0601)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      fontFamily: "var(--font-serif)",
    }}
  >
    {/* Fixed spine strip — unchanged */}
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: "18px",
        background: "#0e0601",
        borderRight: "1px solid rgba(200,160,80,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontFamily: "var(--font-hand)",
          fontSize: "7px",
          color: "rgba(200,160,80,0.3)",
          letterSpacing: "0.15em",
          whiteSpace: "nowrap",
        }}
      >
        Schoolwork · 2026
      </span>
    </div>

    {/* Book wrapper */}
    <div style={{ maxWidth: "380px", width: "100%", padding: "0 24px" }}>
      <div style={{ position: "relative", margin: "16px" }}>

        {/* ── LAYER 1: Interior (parchment content, static) ── */}
        <div
          style={{
            border: "1.5px solid rgba(140,90,40,0.2)",
            borderRadius: "6px",
            padding: "28px 24px",
            position: "relative",
            background: "var(--parchment)",
            boxShadow: "inset 6px 0 16px rgba(0,0,0,0.12), 2px 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Spine gutter shadow — suggests the book binding */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "12px",
              background: "linear-gradient(to right, rgba(0,0,0,0.1), transparent)",
              borderRadius: "6px 0 0 6px",
              pointerEvents: "none",
            }}
          />

          {/*
            ── COPY ALL INTERIOR CONTENT HERE ──
            Copy everything from inside the old motion.div verbatim.
            Update colors as per the color table below.
            This includes: year p, h1, subtitle p, dividers, stats row,
            urgency banner, chapter list (Links), PageStack, Open button,
            manage subjects link, backup link, candlelight toggle, sounds toggle,
            subject management panel, backup panel.
          */}

        </div>

        {/* ── LAYER 2: Front cover (leather, rotates on hinge) ── */}
        <motion.div
          ref={coverRef}
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "left center",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Outer face — leather exterior */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(160deg, #1e0e06 0%, #0e0601 100%)",
              borderRadius: "6px",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              border: "1.5px solid rgba(200,160,80,0.13)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* Leather sheen */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.04) 0%, transparent 55%)",
                pointerEvents: "none",
              }}
            />

            {/* Corner ornaments — same cornerStyles array as before */}
            {cornerStyles.map((style, i) => (
              <div
                key={i}
                style={{ position: "absolute", width: "14px", height: "14px", ...style }}
              />
            ))}

            {/* Inner frame line */}
            <div
              style={{
                position: "absolute",
                inset: "20px",
                border: "1px solid rgba(200,160,80,0.12)",
                borderRadius: "2px",
                pointerEvents: "none",
              }}
            />

            {/* Year */}
            <p
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "9px",
                color: "rgba(200,160,80,0.4)",
                letterSpacing: "0.25em",
                margin: "0 0 20px",
                position: "relative",
              }}
            >
              2026
            </p>

            {/* Title */}
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "24px",
                color: "var(--gold)",
                letterSpacing: "0.3em",
                textAlign: "center",
                margin: "0 0 10px",
                position: "relative",
                textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 -1px 0 rgba(200,160,80,0.15)",
              }}
            >
              SCHOOLWORK
            </h1>

            {/* Divider rule */}
            <div
              style={{
                width: "40px",
                height: "1px",
                background: "rgba(200,160,80,0.25)",
                margin: "0 0 14px",
              }}
            />

            {/* Subtitle */}
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "10px",
                color: "rgba(200,160,80,0.38)",
                letterSpacing: "0.08em",
                margin: 0,
                position: "relative",
              }}
            >
              Year 13 · Te Kura
            </p>
          </div>

          {/* Inner face — dark endpaper (visible when cover is fully open) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(160deg, #2a1408, #1a0c04)",
              borderRadius: "6px",
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              border: "1.5px solid rgba(200,160,80,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "9px",
                color: "rgba(200,160,80,0.18)",
                letterSpacing: "0.15em",
              }}
            >
              est. 2026
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  </div>
);
```

---

## Interior color updates

The interior is now on parchment (`var(--parchment)`), not dark leather. Update every color inside the interior div:

| Old (on dark) | New (on parchment) |
|---|---|
| `color: "var(--gold)"` (titles, text) | `color: "var(--ink-dark)"` |
| `color: "rgba(200,160,80,0.38)"` (muted) | `color: "var(--ink-medium)"` |
| `color: "rgba(200,160,80,0.4)"` (faint) | `color: "var(--ink-light)"` |
| `color: "rgba(200,160,80,0.5)"` (stat labels) | `color: "var(--ink-light)"` |
| `border: "1px solid rgba(200,160,80,0.12)"` | `border: "1px solid rgba(100,60,20,0.12)"` |
| `border: "1px solid rgba(200,160,80,0.06)"` | `border: "1px solid rgba(100,60,20,0.06)"` |
| `background: "rgba(200,160,80,0.05)"` | `background: "rgba(100,60,20,0.04)"` |
| `background: "rgba(200,160,80,0.1)"` (button bg) | `background: "rgba(100,60,20,0.06)"` |
| `color: "var(--gold)"` on stat values | Keep ink-dark EXCEPT overdue (keep `#e06060`) and done (keep `#60a860`) |

The `coverInputStyle` object: update `color` and `WebkitTextFillColor` to `"var(--ink-dark)"`, border to `"1px solid rgba(100,60,20,0.2)"`, background to `"rgba(100,60,20,0.04)"`.

The manage-subjects and backup link buttons: `color: "var(--ink-light)"`.

Candlelight and sounds toggle buttons: `color: "var(--ink-light)"`.

The Roman numeral `i+1` and assignment count spans in the chapter list: `color: "var(--ink-light)"`.

---

## "Open Journal →" button

Update the button to disable during animation:

```tsx
<button
  onClick={handleOpen}
  disabled={animating}
  style={{
    background: "transparent",
    border: "1px solid rgba(100,60,20,0.25)",
    fontFamily: "var(--font-serif)",
    fontSize: "12px",
    color: "var(--ink-dark)",
    padding: "10px 32px",
    letterSpacing: "0.1em",
    cursor: animating ? "default" : "pointer",
    borderRadius: "2px",
    opacity: animating ? 0.45 : 1,
    transition: "opacity 0.15s",
  }}
>
  Open Journal →
</button>
```

---

## Chapter list links

The chapter links (`<Link>` tags) go directly to `/journal/${sub.id}` — they don't trigger the cover close animation. Keep them as-is: `onClick={() => startTransition()}`. This is intentional — direct chapter links are a secondary fast path and don't need the full book-close sequence.

---

## sounds.ts check

If `playBookOpen()` was already added in Session 20, skip this. If it wasn't, add it to `app/lib/sounds.ts`:

```typescript
export function playBookOpen() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.3);
    oscGain.gain.setValueAtTime(0.0, now);
    oscGain.gain.linearRampToValueAtTime(0.45, now + 0.015);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);

    const rustleLen = Math.floor(ctx.sampleRate * 0.18);
    const rustleBuf = ctx.createBuffer(1, rustleLen, ctx.sampleRate);
    const rustleData = rustleBuf.getChannelData(0);
    for (let i = 0; i < rustleLen; i++) {
      rustleData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (rustleLen * 0.35));
    }
    const rustleSrc = ctx.createBufferSource();
    rustleSrc.buffer = rustleBuf;
    const rustleGain = ctx.createGain();
    rustleGain.gain.value = 0.025;
    rustleSrc.connect(rustleGain);
    rustleGain.connect(ctx.destination);
    rustleSrc.start(now + 0.01);
  } catch { /* AudioContext not supported */ }
}
```

---

## Files to touch

| File | Change |
|---|---|
| `app/page.tsx` | Imports, refs, state, three animation functions, full JSX restructure, color updates |
| `app/lib/sounds.ts` | Add `playBookOpen()` if not already there |

---

## Quality bar

- [ ] Page loads → closed leather book (dark, gold title) → 300ms → cover swings open smoothly
- [ ] Open animation: slow start, smooth arc, feels like heavy leather — 700ms
- [ ] Cover past 90°: leather exterior disappears, dark endpaper visible on the back
- [ ] Interior is parchment with ink-colored text — reads cleanly, nothing in gold on parchment
- [ ] Spine gutter shadow visible on left edge of interior (suggests the book binding)
- [ ] Click "Open Journal →": cover snaps shut 350ms, then dark overlay → Today page
- [ ] Button is visually disabled (opacity 0.45, no pointer) during animation — no double-fire
- [ ] All interactive elements work after the cover is open (stats, links, subject management, backup, toggles)
- [ ] No extra `perspective` added inside the cover page — layout's 1200px is enough
- [ ] `WebkitBackfaceVisibility: "hidden"` on both faces (Safari fix — required)
- [ ] TypeScript clean — `tsc --noEmit` zero errors

---

## Tuning notes

- **Open speed**: `duration: 0.7` — go to 0.6 for snappier, 0.8 for heavier. Don't go above 0.9.
- **Close speed**: `duration: 0.35` — don't slow this down. The snap-shut feel is the point.
- **Auto-open delay**: `setTimeout 300` — increase to 400 if the cover still flashes before the page renders on slow devices.
- **Swing angle**: `rotateY: -160` — try -155 (slightly less open) or -165 (almost flat). Don't go to -180 (perfectly flat looks wrong, no depth).
- **Perspective**: already handled by the layout wrapper. Leave it alone.
