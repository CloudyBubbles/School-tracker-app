# Session 20 — Cover Hinge Open

## What this session covers

Three improvements across `app/page.tsx` and `app/lib/sounds.ts`:

1. **Book-open sound** — a deep resonant thud + paper rustle when the cover opens (sounds-on only)
2. **Cover hinge open** — `handleOpen` becomes a full 3D swing: the cover rotates 160° around the left spine hinge, navigation fires at the edge-on midpoint so the transition feels seamless
3. **Cover settle-in entrance** — when the page mounts, the cover card swings into position as if someone just placed the journal on a desk

---

## Part 1 — Book-open sound

In `app/lib/sounds.ts`, add this function after `playTypewriterClick`:

```typescript
export function playBookOpen() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Low thud — spine crack + cover weight landing
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.3);
    oscGain.gain.setValueAtTime(0.0, now);
    oscGain.gain.linearRampToValueAtTime(0.45, now + 0.015); // fast attack
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);

    // Soft paper rustle layered over the thud
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
    rustleSrc.start(now + 0.01); // slight offset so rustle follows thud
  } catch { /* AudioContext not supported */ }
}
```

---

## Part 2 — Cover hinge open

### Import

At the top of `app/page.tsx`, add to existing imports:

```tsx
import { playBookOpen } from "@/app/lib/sounds";
```

### Guard state

Add `opening` to the state block at the top of the component (prevents double-tap during the animation window):

```tsx
const [opening, setOpening] = useState(false);
```

### Rewrite `handleOpen`

Replace the existing `handleOpen` with:

```tsx
const handleOpen = async () => {
  if (opening) return;
  setOpening(true);

  // Sound fires immediately on click
  if (sounds) playBookOpen();

  // Start the cover swinging — don't await, we fire navigation mid-animation
  animate(
    scope.current,
    { rotateY: -160 },
    { duration: 0.55, ease: [0.4, 0, 0.8, 1] }
  );

  // Navigate when the cover is nearly edge-on
  // At 280ms (into a 550ms ease-in arc) the cover is approaching -90° — invisible to the user.
  // startTransition() fades the dark overlay in over 180ms, masking the page swap perfectly.
  await new Promise<void>((resolve) => setTimeout(resolve, 280));
  startTransition();
  router.push("/journal");
};
```

**Why this timing works:**
- The cover starts slow (book has weight/inertia) and builds momentum — `[0.4, 0, 0.8, 1]`
- At ~280ms the cover is near -90° (edge-on, invisible to the user)
- `startTransition()` triggers the dark overlay — 180ms fade masks the page swap
- `router.push` fires at the same moment — new page loads behind the overlay
- Result: cover swings away → brief dark flash → Today page fades in

---

## Part 3 — Cover settle-in entrance

The cover card swings INTO position when the page mounts. No static pop — it arrives.

### Add `opacity: 0` to the motion.div style

On the `motion.div` with `ref={scope}`, add `opacity: 0` so it starts hidden:

```tsx
<motion.div
  ref={scope}
  style={{
    opacity: 0,   // ← add this line
    border: "1.5px solid rgba(200,160,80,0.13)",
    borderRadius: "6px",
    margin: "16px",
    padding: "28px 24px",
    position: "relative",
    transformStyle: "preserve-3d",
    transformOrigin: "left center",
  }}
>
```

### Modify the mount `useEffect`

Change:

```tsx
useEffect(() => { endTransition(); }, [endTransition]);
```

To:

```tsx
useEffect(() => {
  endTransition();
  // Cover swings into position — like someone placing the journal on a desk
  if (scope.current) {
    animate(
      scope.current,
      { rotateY: [8, 0], opacity: [0, 1] },
      { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }
    );
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

The easing `[0.34, 1.56, 0.64, 1]` is the same spring used for assignment card scatter — it overshoots slightly and bounces back, giving the cover a satisfying settled feel.

The empty `[]` dep array is intentional: this should only fire once on mount, never re-fire. The eslint disable is needed because `endTransition` and `animate` aren't in the array (they're stable but the linter doesn't know that).

---

## Files to touch

| File | Change |
|---|---|
| `app/lib/sounds.ts` | Add `playBookOpen()` |
| `app/page.tsx` | Import `playBookOpen`, add `opening` state, rewrite `handleOpen`, add `opacity: 0` to motion.div style, modify mount useEffect |

---

## Quality bar

- [ ] Click "Open Journal →": cover swings left (rotateY toward -160°), navigation fires mid-swing, Today page appears after the dark flash
- [ ] The swing feels physical — slow start (book has weight), accelerates through the arc
- [ ] With sounds on: a low thud + rustle plays the moment you click
- [ ] Rapid double-clicking "Open Journal →" doesn't double-navigate (the `opening` guard blocks it)
- [ ] Page load (or navigate back to cover): the card swings INTO position with a spring bounce — it doesn't just appear
- [ ] No flash of content before the entrance animation (opacity: 0 initial state prevents it)
- [ ] Chapter direct links still work — they use `startTransition()` directly and are unaffected
- [ ] TypeScript compiles clean — `tsc --noEmit` zero errors

---

## Tuning notes (tweak after testing)

- **Swing speed**: `duration: 0.55` — go lower (0.45) for snappier, higher (0.65) for weightier
- **Nav timing**: `setTimeout 280` — if the new page flashes before the overlay is fully dark, increase to 320. If it feels slow, go to 240.
- **Sound volume**: `oscGain gain.value 0.45` / `rustleGain gain.value 0.025` — these are conservative, nudge up if too quiet
- **Settle angle**: `rotateY: [8, 0]` — increase to 15 for a more dramatic entrance, decrease to 4 for subtle
