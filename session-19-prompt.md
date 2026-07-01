# Session 19 — Mobile Responsive (Phone-First)

## Scope

Target: **390px phone screen** (iPhone-sized portrait).
Priority: **Today page + Chapter page**. Cover, Archive, Stats are out of scope this session.
Navigation on mobile: **swipe left/right to move between chapters** (no SideTabs visible).

Four pieces of work, in order:

1. `useIsMobile` hook — new utility
2. Hide SideTabs + global mobile baseline (CSS only)
3. Today page responsive layout
4. Chapter page responsive layout + swipe navigation + chapter nav dots

---

## 1. `app/hooks/useIsMobile.ts` — new file

```ts
import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check(); // run immediately on mount
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}
```

Note: `useState(false)` — default is false (desktop) to avoid layout flash on SSR. The `useEffect` corrects it client-side on mount.

---

## 2. Global mobile baseline — `app/globals.css`

Add at the bottom:

```css
/* ── Mobile baseline (< 640px) ── */
@media (max-width: 640px) {
  body {
    overflow-x: hidden; /* prevent horizontal bleed */
  }

  /* Hide SideTabs on mobile — replaced by swipe + nav dots */
  .sidetabs-container {
    display: none !important;
  }
}
```

SideTabs already uses `className="sidetabs-container"` — no changes needed to SideTabs.tsx.

---

## 3. Today page — `app/journal/page.tsx`

### Import the hook

```tsx
import { useIsMobile } from "@/app/hooks/useIsMobile";
```

Add near the top of the component:

```tsx
const isMobile = useIsMobile();
```

### Padding

Find the inner content wrapper:

```tsx
<div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 32px 60px" }}>
```

Change to:

```tsx
<div style={{ maxWidth: "680px", margin: "0 auto", padding: isMobile ? "20px 16px 60px" : "40px 32px 60px" }}>
```

### Masthead top row

The "Year 13 · Te Kura" / "Vol. I, No. 1" row uses `justifyContent: "space-between"`. On mobile this stays fine — both strings are short. No change needed.

The `h1` already uses `fontSize: "clamp(28px, 5vw, 48px)"` — this scales correctly on mobile (28px floor). No change needed.

### Masthead bottom row (date + assignment count)

```tsx
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
```

On a narrow screen, these two strings can crowd. Change to stack on mobile:

```tsx
<div style={{
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  justifyContent: "space-between",
  alignItems: isMobile ? "flex-start" : "baseline",
  gap: isMobile ? "2px" : "0",
}}>
```

### Keyboard shortcut hint

The hint line `q — add · / — search · esc — close` is keyboard-only and meaningless on mobile. Hide it:

```tsx
{!isMobile && (
  <div style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", opacity: 0.5, marginBottom: "8px", textAlign: "right" }}>
    q — add · / — search · esc — close
  </div>
)}
```

### Quick-add form

The form fields already stack vertically — no change needed. The form already works fine on mobile.

### Week strip

The week strip uses `gridTemplateColumns: "repeat(7, 1fr)"` — it adapts to container width automatically. No change needed.

---

## 4. Chapter page — `app/journal/[subject]/page.tsx`

### Import the hook

```tsx
import { useIsMobile } from "@/app/hooks/useIsMobile";
```

Add near top of component:

```tsx
const isMobile = useIsMobile();
```

### Padding

```tsx
<div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 32px 60px" }}>
```

Change to:

```tsx
<div style={{ maxWidth: "680px", margin: "0 auto", padding: isMobile ? "20px 16px 60px" : "40px 32px 60px" }}>
```

### Keyboard shortcut hint

Same as Today page — hide on mobile:

```tsx
{!isMobile && (
  <span style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", opacity: 0.45, marginLeft: "8px" }}>
    a — add · esc — close
  </span>
)}
```

### Swipe to navigate chapters

Add two refs and two touch handlers to the component:

```tsx
const touchStartRef = useRef<{ x: number; y: number } | null>(null);

const handleTouchStart = (e: React.TouchEvent) => {
  touchStartRef.current = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY,
  };
};

const handleTouchEnd = (e: React.TouchEvent) => {
  if (!touchStartRef.current || !isMobile || flipping) return;
  const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
  const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
  touchStartRef.current = null;

  // Only trigger if clearly horizontal (dx > threshold AND more horizontal than vertical)
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;

  const currentIdx = subjects.findIndex((s) => s.id === subjectId);
  if (dx < 0 && currentIdx < subjects.length - 1) {
    // swipe left → next chapter
    handleChapterNav(`/journal/${subjects[currentIdx + 1].id}`);
  } else if (dx > 0 && currentIdx > 0) {
    // swipe right → previous chapter
    handleChapterNav(`/journal/${subjects[currentIdx - 1].id}`);
  }
};
```

Apply to the outermost div (the flex wrapper that wraps both the motion.div and SideTabs):

```tsx
<div
  style={{ display: "flex", minHeight: "100vh", transformStyle: "preserve-3d" }}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
```

**Why on the outermost div:** it covers the full viewport including scroll area, so the gesture is captured regardless of where on the page the user starts the swipe.

**Why no `preventDefault`:** we don't call `e.preventDefault()` anywhere. The threshold check (`Math.abs(dx) < Math.abs(dy)`) means vertical scrolls are ignored naturally — the browser's own scroll handling is never blocked.

### Chapter nav dots

Add after the `<PageStack />` component (before the closing `</div>` of the inner content wrapper), visible only on mobile:

```tsx
{isMobile && subjects.length > 1 && (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "8px",
      padding: "20px 0 8px",
    }}
  >
    {subjects.map((s) => {
      const isActive = s.id === subjectId;
      return (
        <button
          key={s.id}
          onClick={() => !isActive && !flipping && handleChapterNav(`/journal/${s.id}`)}
          style={{
            width: isActive ? "20px" : "8px",
            height: "8px",
            borderRadius: "4px",
            background: isActive ? s.colour : "rgba(140,100,60,0.2)",
            border: "none",
            padding: 0,
            cursor: isActive ? "default" : "pointer",
            transition: "width 0.2s ease, background 0.2s ease",
            flexShrink: 0,
          }}
        />
      );
    })}
  </div>
)}
```

The active dot expands to a pill (20px wide, 8px tall) in the subject's own colour. Non-active dots are small neutral circles. Tapping any dot navigates to that chapter.

---

## Files to touch

| File | Change |
|---|---|
| `app/hooks/useIsMobile.ts` | **NEW** — mobile breakpoint hook |
| `app/globals.css` | Hide SideTabs + overflow-x: hidden on mobile |
| `app/journal/page.tsx` | Import hook, responsive padding, stack masthead date row, hide shortcut hint |
| `app/journal/[subject]/page.tsx` | Import hook, responsive padding, swipe handlers, chapter nav dots, hide shortcut hint |

**Not touched this session:** cover page, archive, stats, PomodoroTimer, SideTabs.tsx itself.

---

## Quality bar

- [ ] No horizontal overflow on 390px (no scrollbar, no elements poking out the right)
- [ ] SideTabs invisible on mobile — page content fills full width
- [ ] Padding is 16px on phone, 32px on desktop — verify on both
- [ ] Swipe left on a chapter navigates to the next subject; swipe right goes back
- [ ] Swipe does NOT trigger when scrolling vertically (swipe a long chapter up and down — no accidental nav)
- [ ] Chapter nav dots show on mobile, correct subject highlighted, tapping a dot navigates
- [ ] Page flip animation still plays on mobile swipe (it uses `handleChapterNav` which already does the flip)
- [ ] TypeScript compiles clean — `tsc --noEmit` zero errors

---

## Known limitation to note

The cover page (`app/page.tsx`) is not touched this session. On a phone it may have overflow from the 3D book layout — that's acceptable for now and earns its own pass later.
