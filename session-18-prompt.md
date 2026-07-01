# Session 18 — Animations & Sound

## What we're building

Four features, ordered from easiest to hardest:

1. **Typewriter sounds** — global keydown listener, Web Audio, toggleable
2. **Card scatter-and-settle** — Framer Motion entrance on chapter load
3. **Done ink-stamp** — radial stamp animation when marking complete
4. **3D chapter page flip** — the headline: full 3D rotateY between chapters

Do them in this order. Sounds first because it's isolated and proves the Web Audio pattern. Page flip last because it touches navigation.

---

## Quick fix first (Pomodoro reset bug)

Before anything else, fix this one line in `app/components/journal/PomodoroTimer.tsx`:

```tsx
// Current — snaps to 5 min when timer is at 0:00 because 5 is closest to 0
const currentMins = display.m + (display.s > 0 ? 1 : 0);
const snappedMins = [5, 10, 25].reduce((a, b) =>
  Math.abs(b - currentMins) < Math.abs(a - currentMins) ? b : a
);

// Fix — when at exactly 0, snap back to 25 (the default work session)
const handleReset = () => {
  setRunning(false);
  const currentMins = totalRef.current / 60;
  const snappedMins = currentMins === 0
    ? 25
    : [5, 10, 25].reduce((a, b) =>
        Math.abs(b - currentMins) < Math.abs(a - currentMins) ? b : a
      );
  setPreset(snappedMins);
};
```

---

## Feature 1: Typewriter Sounds

### New file: `app/lib/sounds.ts`

```ts
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Chrome suspends AudioContext until a user gesture — resume if needed
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export function playTypewriterClick() {
  try {
    const ctx = getCtx();
    // Short white-noise burst with exponential decay — sounds like a typewriter key
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.025), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0.07;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch {
    // AudioContext not supported — silent fail
  }
}
```

### New file: `app/components/SoundManager.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { playTypewriterClick } from "@/app/lib/sounds";

export default function SoundManager() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement) {
        // Only printable characters — no Ctrl/Cmd shortcuts
        if (!e.metaKey && !e.ctrlKey && e.key.length === 1) {
          if (document.documentElement.classList.contains("sounds-on")) {
            playTypewriterClick();
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null;
}
```

### Update `app/layout.tsx`

1. Import and render `<SoundManager />` as a sibling to `<PomodoroTimer />` in the body.

2. Add `sounds` to the no-flash inline `<script>` in `<head>`:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `try{
      if(localStorage.getItem('candlelight')==='true')
        document.documentElement.classList.add('candlelight');
      if(localStorage.getItem('sounds')==='true')
        document.documentElement.classList.add('sounds-on');
    }catch(e){}`,
  }}
/>
```

### Toggle button — add to `app/page.tsx` AND `app/journal/page.tsx`

Copy the exact pattern used for candlelight. Add alongside it:

```tsx
// State
const [sounds, setSounds] = useState(false);

// In mount useEffect
setSounds(document.documentElement.classList.contains("sounds-on"));

// Toggle function
const toggleSounds = () => {
  const next = !sounds;
  setSounds(next);
  if (next) {
    document.documentElement.classList.add("sounds-on");
    localStorage.setItem("sounds", "true");
  } else {
    document.documentElement.classList.remove("sounds-on");
    localStorage.setItem("sounds", "false");
  }
};

// Button (put next to the candlelight button)
<button onClick={toggleSounds} style={/* same style as candlelight button */}>
  {sounds ? "🖋 sounds on" : "🖋 sounds off"}
</button>
```

**Verify:** open a chapter, type in the search bar — you should hear subtle mechanical clicks. Toggle off → silence.

---

## Feature 2: Card Scatter-and-Settle

In `app/journal/[subject]/page.tsx`, wrap the card list with Framer Motion `staggerChildren`.

### Setup

The cards are rendered in a sorted array inside a `<div>`. Replace that outer div with a `motion.div` and wrap each card with a `motion.div`:

```tsx
import { motion } from "framer-motion";

// Outer container — key on `subject` so animation replays when chapter changes
<motion.div
  key={subject}
  initial="hidden"
  animate="visible"
  variants={{
    hidden: {},
    visible: { transition: { staggerChildren: 0.045 } },
  }}
>
  {sortedAssignments.map((a, i) => {
    // Deterministic rotation per card — stable across re-renders, no Math.random()
    const rot = ((i * 7 + a.id.charCodeAt(0)) % 9) - 4; // −4° to +4°

    return (
      <motion.div
        key={a.id}
        variants={{
          hidden: { y: -18, rotate: rot, opacity: 0 },
          visible: {
            y: 0,
            rotate: 0,
            opacity: 1,
            transition: {
              duration: 0.38,
              ease: [0.34, 1.56, 0.64, 1], // spring overshoot — gives the settle bounce
            },
          },
        }}
      >
        {/* existing card content exactly as it is now */}
      </motion.div>
    );
  })}
</motion.div>
```

### Important
- `key={subject}` on the outer container means the animation only replays when you switch chapters, NOT on every status-change re-render.
- The inner `motion.div` uses `key={a.id}` — already present, no change needed.
- Do not add Framer Motion to the drag-handle area — draggable elements and `motion.div` at the same level can conflict. Keep the existing drag-and-drop wiring as-is.

**Verify:** open a chapter — cards drop and settle. Change a status — NO re-animation. Switch to another chapter — cards drop and settle again.

---

## Feature 3: Done Ink-Stamp

### Goal

When an assignment cycles to "Done", a circular ink stamp expands from the card center, pulses, then fades — leaving a sense of completion without cluttering the UI.

### Per-card state

The card component (or card section in `[subject]/page.tsx`) needs one new piece of state:

```tsx
const [stampingId, setStampingId] = useState<string | null>(null);
```

In the status-cycle handler, add:

```tsx
const handleCycleStatus = (id: string) => {
  const updated = assignments.map((a) => {
    if (a.id !== id) return a;
    const next = cycleAssignmentStatus(a.id, assignments); // existing call
    // ...existing logic...
    return next;
  });
  saveAssignments(updated);
  setAssignments(updated);

  // Trigger stamp if this assignment just became Done
  const newStatus = updated.find((a) => a.id === id)?.status;
  if (newStatus === "Done") {
    setStampingId(id);
    setTimeout(() => setStampingId(null), 700);
  }
};
```

### Stamp overlay

Inside each card, add this absolutely-positioned overlay. The card already needs `position: relative` — verify it has that, add if not:

```tsx
{stampingId === a.id && (
  <motion.div
    initial={{ scale: 0, opacity: 1 }}
    animate={{ scale: [0, 1.15, 1], opacity: [1, 0.85, 0] }}
    transition={{ duration: 0.65, times: [0, 0.45, 1], ease: "easeOut" }}
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      zIndex: 10,
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: "3px solid rgba(70, 110, 50, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-hand)",
        fontSize: "26px",
        color: "rgba(70, 110, 50, 0.75)",
      }}
    >
      ✓
    </div>
  </motion.div>
)}
```

**Verify:** click a card status to Done — green stamp expands and fades. Click To do → In progress → Done again — stamp plays again cleanly.

---

## Feature 4: 3D Chapter Page Flip

This is the complex one. Read all the notes before writing a single line.

### How it works

When the user clicks a chapter tab in SideTabs from within a chapter page:
1. The current chapter page animates out: `rotateY(0)` → `rotateY(-90deg)`, origin `left center` (spine), 300ms
2. At the midpoint (page is edge-on), the navigation fires
3. The incoming chapter page animates in: `rotateY(90deg)` → `rotateY(0)`, 300ms

The `perspective: 1200px` on the layout wrapper in `app/layout.tsx` is already in place.

### CSS — add to `app/globals.css`

```css
@keyframes chapter-flip-out {
  from { transform: rotateY(0deg); }
  to   { transform: rotateY(-90deg); }
}

@keyframes chapter-flip-in {
  from { transform: rotateY(90deg); }
  to   { transform: rotateY(0deg); }
}

.chapter-flipping-out {
  transform-origin: left center;
  animation: chapter-flip-out 0.28s ease-in forwards;
  backface-visibility: hidden;
}

.chapter-flipping-in {
  transform-origin: left center;
  animation: chapter-flip-in 0.28s ease-out forwards;
  backface-visibility: hidden;
}
```

### SideTabs change

`SideTabs` needs an optional `onChapterNav` prop. When provided, use it instead of the existing navigation for chapter tabs.

```tsx
// In SideTabs.tsx — add to props interface
onChapterNav?: (href: string) => void;

// In the tab click handler
const handleTabClick = (tab: Tab) => {
  if (tab.id.startsWith("__")) {
    // system tabs (home, archive, stats) — normal navigation
    navigate(href);
  } else {
    // subject chapter tab
    if (onChapterNav) {
      onChapterNav(href);
    } else {
      navigate(href);
    }
  }
};
```

### `[subject]/page.tsx` changes

```tsx
import { useRouter } from "next/navigation";

// Add state
const [flipping, setFlipping] = useState(false);
const pageRef = useRef<HTMLDivElement>(null);
const router = useRouter();

// Chapter nav handler — passed to SideTabs
const handleChapterNav = async (href: string) => {
  if (flipping) return; // prevent double-tap
  setFlipping(true);
  pageRef.current?.classList.add("chapter-flipping-out");
  await new Promise((r) => setTimeout(r, 280)); // match animation duration
  router.push(href);
  // Don't need to clean up — the component unmounts on nav
};

// On mount — play the flip-in animation
useEffect(() => {
  if (pageRef.current) {
    pageRef.current.classList.add("chapter-flipping-in");
    setTimeout(() => {
      pageRef.current?.classList.remove("chapter-flipping-in");
    }, 280);
  }
}, []); // empty deps — runs once on mount only

// Apply ref to the outermost div of the chapter page
<div ref={pageRef} className="journal-page" style={{ /* existing styles */ }}>
  {/* ... */}
  <SideTabs
    {...existingProps}
    onChapterNav={handleChapterNav}
  />
</div>
```

### Edge cases to handle

- **First chapter visit** — the `chapter-flipping-in` on mount handles this. It plays every time you arrive at a chapter, whether from cover or from another chapter.
- **Stats / Archive / Home** — SideTabs only passes `onChapterNav` for subject tabs. System tabs (`__home`, `__archive`, `__stats`) still use the regular PageTransition.
- **Rapid clicking** — the `if (flipping) return` guard prevents double-triggers during the 280ms animation.
- **Back button** — browser back doesn't trigger this, it uses Next.js routing directly. That's acceptable.

### Important: `transformStyle`

For the 3D rotation to look correct (not flat), the page wrapper that receives `chapter-flipping-out`/`chapter-flipping-in` must be a direct child of the element with `perspective: 1200px`. Check the layout:

In `app/layout.tsx`:
```tsx
<div style={{ perspective: "1200px", perspectiveOrigin: "center center" }}>
  <PageTransitionProvider>
    {children}
  </PageTransitionProvider>
</div>
```

`{children}` is the chapter page. That's one level inside `PageTransitionProvider`. Check what `PageTransitionProvider` renders — if it wraps children in a div, that div gets the animation, not the perspective child. You may need to apply `transformStyle: "preserve-3d"` on any wrapper in between.

If the perspective calculation looks flat (the page just shrinks on the left instead of rotating), it's a `transformStyle` issue — apply `style={{ transformStyle: "preserve-3d" }}` to the `PageTransitionProvider` wrapper div.

---

## Files to touch

| File | Change |
|------|--------|
| `app/components/journal/PomodoroTimer.tsx` | Quick fix: reset after 0:00 snaps to 25 min |
| `app/lib/sounds.ts` | **NEW** — Web Audio typewriter click function |
| `app/components/SoundManager.tsx` | **NEW** — global keydown listener |
| `app/layout.tsx` | Import SoundManager, add `sounds-on` to no-flash script |
| `app/page.tsx` | Sounds toggle button |
| `app/journal/page.tsx` | Sounds toggle button |
| `app/globals.css` | `chapter-flip-out`, `chapter-flip-in` keyframes + classes |
| `app/components/journal/SideTabs.tsx` | Optional `onChapterNav` prop |
| `app/journal/[subject]/page.tsx` | Scatter-and-settle, done stamp, page flip trigger + enter |

---

## Quality bar

- [ ] Pomodoro reset after 0:00 goes to 25 min, not 5 min
- [ ] Typewriter sound heard on keystroke, silent when toggled off, toggle persists on refresh
- [ ] Cards scatter and settle on chapter load — does NOT replay on status change
- [ ] Done stamp plays and fades cleanly — no layout shift, no remnant element
- [ ] Page flip is smooth (no white flash, no jank) chapter-to-chapter
- [ ] Navigating to Stats or Archive does NOT trigger the flip
- [ ] All features work with candlelight mode on
- [ ] TypeScript compiles clean — `tsc --noEmit` passes with zero errors
