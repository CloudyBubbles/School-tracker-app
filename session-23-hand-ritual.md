# Session 23 — Hand-Driven Open/Close Ritual

## What this session covers

Replaces the static decorative hand from session 22 with an active one, and gives the cover
a real close animation again (removed in session 22 in favour of the zoom).

The hand is now two separate layers:

- **Grip hand** (`gripHandRef`) — nested as a direct child of the cover's `motion.div`,
  alongside the outer/inner faces. It has no transform of its own, so it inherits the
  cover's `rotateY` exactly and rides along with it. It also has its own
  `backfaceVisibility: hidden`, so it disappears at the exact same instant the leather
  cover itself flips past edge-on — no manual timing needed for that part.
- **Rest hand** (`restHandRef`) — the original independent layer, pinned to a fixed screen
  position. Crossfades in/out around the edge-on crossing.

Both directions (mount-open, click-to-close) now have a **quick** version (close to the old
session 21/22 behaviour) and a **full ritual** version (multi-stage, ~1.6-1.8s, choreographed
via a single keyframed `rotateY` animation with per-segment easing: hold → drag → hitch →
release → spring-settle). Which one plays is gated by two independent `sessionStorage` flags
— `schoolwork-ritual-open-seen` and `schoolwork-ritual-close-seen` — so the *first* open this
browser session gets the full ritual, the *first* close this session gets the full ritual,
and everything after that is quick. This is a trial default — see Tuning notes for how to
change it.

Sound is layered too: `playBookOpenRitual()` / `playBookCloseRitual()` in `app/lib/sounds.ts`
schedule a press tap, a filtered-noise creak during the hitch, and a settle thud (open) or a
softer close thud with no rustle bloom (close) — all procedural Web Audio, no new audio files.

**Explicitly out of scope for this session** (deferred, discussed separately): the Canvas
ink-bleed rendering, the quill-written title, candlelight sync, and the garnish/easter-egg
ideas (fumble variant, overdue tell, small hours, paw print, etc). This session is just the
core mechanic — hand as the thing that visibly opens and closes the book.

---

## Known placeholder

`gripHandRef` currently renders `/hand.png` (the existing resting-pose illustration) as a
stand-in. The intended asset is a new gripping pose — fingers curled over the top-right
corner of the cover. Draft image-gen prompt:

> Pen and ink illustration. A right human hand, dorsal view, fingers curled over the
> top-right corner of a closed dark leather journal, gripping the edge as if about to pull
> it open. Thumb tucked beneath the cover, out of view. Knuckles slightly raised with the
> grip. Wrist exits the right side of the frame. Warm natural skin tone, subtle ink
> crosshatching in the style of 1800s manuscript book plates. Transparent background.
> Subject occupies lower-right quadrant of the frame.

Once sourced, save as `/public/hand-grip.png` and swap the `src` in the grip-hand `<img>`
(app/page.tsx, inside the cover's `motion.div`, last child before its closing tag).

---

## Files touched

| File | Change |
|---|---|
| `app/lib/sounds.ts` | Added `playBookOpenRitual()`, `playBookCloseRitual()` |
| `app/page.tsx` | Added `RITUAL_OPEN_KEY`/`RITUAL_CLOSE_KEY` + `seenThisSession`/`markSeen` helpers, `gripHandRef`/`restHandRef`, split `openCover`/`handleOpen` into quick/full variants, restructured the hand JSX into grip (nested in cover) + rest (independent) layers, updated the mount effect to pre-hide the rest hand when the full ritual is about to play |

---

## Quality bar

- [ ] First page load this browser session: full ritual plays — cover holds briefly, drags
      open with a hitch partway, releases, and settles with a slight overshoot (~1.8s total)
- [ ] During the full open ritual, the grip hand is visible attached to the corner for the
      first half of the swing, then disappears (cull) right as the rest hand fades in
- [ ] No moment where both hands are visible at once, and no moment where neither is visible
- [ ] Quick open (any subsequent mount this session): behaves like the old single-swing
      version — hand just present, no ritual
- [ ] First click of "Open Journal →" this session: full close ritual plays (mirrors open),
      *then* the existing zoom-to-camera, *then* navigate
- [ ] Subsequent clicks this session: quick snap-shut (~350ms), then zoom, then navigate
- [ ] Sounds (when on): open ritual = press tap → creak → thud+rustle; close ritual = creak
      → soft thud, no rustle
- [ ] `disabled` + `opacity: 0.45` on the button still blocks double-clicks while `animating`
- [ ] `tsc --noEmit` — zero TypeScript errors (confirmed clean as of this session)

---

## Tuning notes

- **Ritual frequency**: to force full every time, change `seenThisSession` to always
  `return false`. To make "seen" permanent instead of per-session, swap `sessionStorage` for
  `localStorage` in `seenThisSession`/`markSeen`.
- **Rest-hand crossfade timing**: the `setTimeout(..., 1150)` inside `openCoverFull` and the
  fade in `closeCoverFull` are eyeballed guesses at where the cover crosses edge-on given the
  keyframe/ease curves — watch the actual swing and nudge the offset until the grip→rest
  handoff reads as one continuous hand, not a swap.
- **Hitch feel**: the `-75 → -80` (open) / `-80 → -75` (close) keyframe pair is the "stall."
  Widen the rotation gap or lengthen its time slice for a more pronounced hesitation, narrow
  it if it reads as a stutter/bug rather than a deliberate pause.
- **Overall duration**: 1.8s open / 1.6s close. Both are one `animate()` call each — adjust
  the top-level `duration` and rescale the `times` array proportionally.
- **Sound offsets**: `playBookOpenRitual`'s press/creak/settle are scheduled at `now`,
  `now + 0.85`, `now + 1.65`. These should track the visual `times` array — if you change the
  visual hitch timing, move the creak's `now + 0.85` to match.
