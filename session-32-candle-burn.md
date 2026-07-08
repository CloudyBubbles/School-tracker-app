# Session 32 — Candle-burn (first "alive" build)

**Type:** Cosmetic / design build. The first piece of bringing the journal alive.
**Compass:** `design-north-star.md` — read it first. This build must serve it, not just "add an animation."
**Depends on / sequencing:** Build this **after Session 31 (Supabase) is verified working and merged to `main`.** It touches `PomodoroTimer.tsx`, which Session 31 just rewired — building it on the unmerged migration branch will tangle the two. New branch off `main`: `william/candle-burn`.

---

## How to hand this to Claude Code
Paste this file **and** `design-north-star.md`. This is a design build — the aesthetic doc is the spec as much as this file is.

## Guardrails (hard)
- **Do NOT touch the 3D cover** (`app/page.tsx` — perspective / backface / zoom). `PROJECT-INSTRUCTIONS.md` flags it fragile. This build lives entirely in the Pomodoro widget.
- **Do NOT change the Pomodoro's timing/logging logic** — it was just rewired for Supabase and logs real focus minutes. This is *visual only*; the candle reads the timer, never drives it.
- **No new dependencies.** SVG/CSS + the framer-motion already in the project.
- TypeScript strict — `tsc --noEmit` clean. Respect `prefers-reduced-motion`.

---

## What to build
A candle inside the Pomodoro widget that **burns down as the focus session runs**. It reacts to *your* work — it's not idle decoration.

**Behaviour:**
- **Wax height = remaining time.** Full session → tall candle; as the timer counts down, the wax shortens proportionally. At 00:00 it's a stub.
- **Flame while running.** A small, soft flame with a subtle flicker (slow, 1–2px sway, gentle brightness breathe). When the timer is **paused**, the flame stills/dims — paused = the candle waits with you.
- **Gutters out at zero.** When time's up, the flame snuffs and a single thin wisp of smoke rises briefly, then fades. Not a big effect — one quiet moment.
- **Relights on start/reset.** Starting a new session restores the wax to full and relights.
- **Candlelight mode is its home.** In candlelight mode the candle is present and its glow reads warm; in daylight mode keep it subtle/understated (it can be smaller or lower-contrast). It should feel like it belongs to the candlelight, not bolted on.

**Anchor to the north-star (don't skip):**
- *Reactive, not scripted* — every state comes from the real timer (running / paused / remaining / done), nothing on a loop for its own sake.
- *Restraint* — TLOU/Metro feel real because they're understated. One soft flame beats a roaring fire. If it reads as "cute," dial it back.
- *Readability untouched* — the timer digits and controls stay perfectly legible. The candle never competes with them.

## Files / functions / order
1. New component `app/components/journal/Candle.tsx` — pure presentational, props: `{ remainingFraction: number; state: "running" | "paused" | "idle" | "spent" }`. SVG candle: wax `<rect>`/path whose height is driven by `remainingFraction`; flame group with the flicker (framer-motion `animate` or CSS keyframes); smoke wisp shown only on the `spent` transition.
2. `PomodoroTimer.tsx` — compute `remainingFraction` from the existing `totalRef` / display state and derive `state` from the existing `running` / `timeUp` flags. Render `<Candle />` in the open panel. **Read-only** from the timer's existing state — add no new timing logic.
3. Reduced-motion: if `prefers-reduced-motion`, drop the flicker/smoke — show a static candle at the right height.

## Verify (before "done")
- `tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds.
- Watch a real session: wax visibly drops over the countdown; pause stills the flame; hitting 0 snuffs + wisps once; start relights full.
- **Focus minutes still log to Stats** exactly as before (prove the timer logic is untouched).
- Check both candlelight and daylight modes, and reduced-motion.

## Out of scope (its own session later)
The **Living Volume** signature — the book aging/thickening with use, the year-end "new volume" ceremony, the bookshelf. That's the heart of the north-star but it touches the fragile 3D cover, so it gets its own careful design session, not this one. This candle is the safe, self-contained first taste of "alive."
