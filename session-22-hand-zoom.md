# Session 22 — Hand Illustration + Camera Zoom

## What this session covers

Two changes to `app/page.tsx`:

1. **Hand illustration** — a natural-skin-tone hand appears at the bottom-right of the book from page load. No entry animation. It's just present, like someone is already holding the journal. Contrasts the dark leather and gold.
2. **Camera zoom on Open Journal** — instead of closing the cover, clicking "Open Journal →" zooms the entire book (cover open, hand included) toward the camera. Hand exits off-frame naturally with the zoom. Navigate fires mid-zoom behind the dark transition overlay.

`closeCover` is removed — it's no longer used.

---

## Prerequisites: `/public/hand.png`

The hand element uses `<img src="/public/hand.png">`. This file must exist before the feature renders correctly. If it doesn't exist yet, use the SVG placeholder in Part 4 while sourcing the illustration.

### Image generation prompt

Use this in **DALL-E 3** or **Midjourney** to generate the file:

> "Pen and ink illustration. A right human hand, dorsal view — back of hand visible, palm facing down — resting gently at the lower edge of a closed dark leather journal, as if the hand just finished opening the cover. Fingers relaxed, slightly spread. Wrist exits the right side of the frame. Warm natural skin tone, subtle ink crosshatching in the style of 1800s manuscript book plates. Transparent or white background. Subject occupies lower half of the frame."

For Midjourney: append `--ar 4:3 --style raw --no photo`

Save the output as `/public/hand.png` (PNG with transparency preferred).

---

## Part 1 — Add `bookRef`

In the refs block at the top of the component, after `coverRef`:

```tsx
const bookRef = useRef<HTMLDivElement>(null);
```

---

## Part 2 — Remove `closeCover`, rewrite `handleOpen`

**Delete the entire `closeCover` function** — it's no longer called anywhere.

**Replace `handleOpen`** with:

```tsx
const handleOpen = async () => {
  if (animating) return;
  setAnimating(true);

  // Zoom the open book toward the camera — hand exits with it
  if (bookRef.current) {
    animate(
      bookRef.current,
      { scale: 4.5 },
      { duration: 0.65, ease: [0.2, 0, 0.4, 1] }
    );
  }

  // Navigate mid-zoom: startTransition overlay cuts in and masks the page swap
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  startTransition();
  router.push("/journal");
};
```

**Why this works:**
- The cover is already open from the mount animation — no need to close it first
- `animate()` fires without `await` — the zoom runs independently
- At 300ms the book fills most of the viewport; `startTransition()` brings the dark overlay in (180ms fade), masking the swap cleanly
- `router.push` fires at the same moment — Today page loads behind the overlay
- The hand is a child of `bookRef`'s div, so it scales and exits frame with the book — no separate hand exit needed

Note: `animate()` from framer-motion can target any DOM element via ref, not just `motion.*` components. This is intentional.

---

## Part 3 — Apply `bookRef` to the wrapper div

The position:relative div on line ~268 is the common parent of the parchment interior, the cover, and the hand. Add `ref` and `transformOrigin` to it:

**Change:**
```tsx
<div style={{ position: "relative", margin: "16px" }}>
```

**To:**
```tsx
<div ref={bookRef} style={{ position: "relative", margin: "16px", transformOrigin: "center center" }}>
```

`transformOrigin: "center center"` ensures the zoom pushes in from the middle of the book rather than from the top-left corner.

---

## Part 4 — Add the hand element

Place this **immediately after** the `</motion.div>` closing tag of the cover (Layer 2), before the closing `</div>` of the `bookRef` div:

```tsx
{/* Hand — visible from mount, no animation, exits frame with book on zoom */}
<div
  style={{
    position: "absolute",
    bottom: -16,
    right: -20,
    width: 120,
    pointerEvents: "none",
    userSelect: "none" as const,
    zIndex: 10,
    filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.45))",
  }}
>
  <img
    src="/hand.png"
    alt=""
    draggable={false}
    style={{ width: "100%", display: "block", mixBlendMode: "multiply" }}
  />
</div>
```

**If `/public/hand.png` doesn't exist yet**, use this SVG as a placeholder (swap it for the `<img>` once the file is ready):

```tsx
{/* Hand placeholder — swap for <img src="/hand.png"> once the illustration is ready */}
<div
  style={{
    position: "absolute",
    bottom: -16,
    right: -20,
    width: 120,
    pointerEvents: "none",
    userSelect: "none" as const,
    zIndex: 10,
    filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.45))",
  }}
>
  <svg
    viewBox="0 0 80 140"
    width="120"
    fill="none"
    stroke="rgba(110,65,30,0.75)"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Palm */}
    <path d="M18,120 C16,108 15,93 16,82 L18,76 L58,76 C60,82 62,96 62,120 Q40,128 18,120 Z" strokeWidth="1.6" />
    {/* Index */}
    <path d="M20,77 C20,65 19,50 20,36 Q21,29 25,28 Q29,28 30,36 C31,50 30,65 30,77" strokeWidth="1.6" />
    {/* Middle */}
    <path d="M31,77 C31,63 30,45 31,20 Q32,13 37,12 Q42,12 43,20 C44,45 43,63 43,77" strokeWidth="1.6" />
    {/* Ring */}
    <path d="M44,77 C44,64 43,50 44,36 Q45,29 49,28 Q53,28 54,36 C55,50 54,64 54,77" strokeWidth="1.6" />
    {/* Pinky */}
    <path d="M55,78 C55,68 55,56 56,46 Q57,40 60,39 Q63,39 64,46 C65,56 65,68 65,78" strokeWidth="1.6" />
    {/* Thumb */}
    <path d="M18,100 C12,94 7,84 6,74 Q5,65 9,61 Q13,57 17,63 C21,70 20,85 18,100" strokeWidth="1.6" />
    {/* Knuckle creases */}
    <path d="M20,55 Q25,53 30,55" strokeWidth="0.9" strokeOpacity="0.45" />
    <path d="M20,66 Q25,64 30,66" strokeWidth="0.9" strokeOpacity="0.45" />
    <path d="M31,40 Q37,38 43,40" strokeWidth="0.9" strokeOpacity="0.45" />
    <path d="M31,58 Q37,56 43,58" strokeWidth="0.9" strokeOpacity="0.45" />
    <path d="M44,55 Q49,53 54,55" strokeWidth="0.9" strokeOpacity="0.45" />
    <path d="M44,66 Q49,64 54,66" strokeWidth="0.9" strokeOpacity="0.45" />
    <path d="M55,60 Q60,58 65,60" strokeWidth="0.9" strokeOpacity="0.45" />
    {/* Wrist */}
    <line x1="22" y1="122" x2="24" y2="137" strokeWidth="1.1" />
    <line x1="56" y1="122" x2="54" y2="137" strokeWidth="1.1" />
    <path d="M26,133 Q40,138 52,133" strokeWidth="0.8" strokeOpacity="0.35" />
  </svg>
</div>
```

**Why no entry animation:** The hand is rendered with no opacity transition, no translateY, nothing. It appears the moment the page paints. This is intentional — the hand being already present (as if someone is holding the book) is the whole effect. Don't add an animation here.

**z-index note:** The hand div is DOM order 3 inside the relative container (parchment → cover → hand), with `zIndex: 10`. This puts it on top of the leather cover while the cover is closed. It looks like the hand is resting ON the cover. As the cover swings open on mount, the hand stays in place against the parchment. This is correct behaviour.

---

## Files to touch

| File | Change |
|---|---|
| `/public/hand.png` | Add the illustration (see image gen prompt above) |
| `app/page.tsx` | Add `bookRef`, remove `closeCover`, rewrite `handleOpen`, add ref+transformOrigin to wrapper div, add hand element |

---

## Quality bar

- [ ] Page loads: hand is visible immediately at bottom-right of the book — no animation, no fade
- [ ] The hand sits ON TOP of the leather cover (visually, not physically) while the cover is closed
- [ ] Mount animation: cover swings open, hand stays put — looks like the hand just set the book down and the cover opened
- [ ] "Open Journal →" click: book + hand zoom toward camera (scale ~4.5), hand exits frame as part of the zoom
- [ ] Dark overlay cuts in at ~300ms, masking the page swap — no flash of the Today page during the zoom
- [ ] Navigating back to cover page: mount animation replays, hand is immediately visible again
- [ ] `disabled` + `opacity: 0.45` on the button still blocks double-clicks while `animating` is true
- [ ] No z-index conflict between hand, cover, and interior
- [ ] `tsc --noEmit` — zero TypeScript errors

---

## Tuning notes

- **Zoom scale**: `scale: 4.5` — go higher (5-6) for a more aggressive camera push, lower (3-3.5) for subtle
- **Zoom speed**: `duration: 0.65` — lower for snappier, higher for cinematic slow push
- **Nav timing**: `setTimeout 300` — if the Today page flashes before the overlay is solid, increase to 360. If it feels late, try 240
- **Hand position**: `bottom: -16, right: -20` — adjust until fingers appear to grip the bottom-right corner of the cover. Try `bottom: -8, right: -30` if the hand is too centred, or `bottom: -24, right: -10` if it needs to be lower
- **Hand size**: `width: 120` — larger (140-160) for a more prominent presence, smaller (90-100) for subtle peek
- **Drop shadow**: `filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.45))"` — increase opacity for more separation from the book, remove entirely if it looks overdone
- **transformOrigin**: `center center` zooms from the middle of the book. If the parchment content feels off-centre during zoom, try `center 40%` to push from slightly above the middle
