# Session 27 — Cosmetic Pass

Sequenced from the cosmetic ideas in `FEATURE-BRAINSTORM.md`. Two are detailed enough to build
straight from this file; the rest are queued with just enough detail to pick up later. This is
a design-pass-style session, not a features session — nothing here should change how anything
*works*, only how it looks/feels. If any of these end up needing a logic change to work,
that's a sign it belongs back in a functional session instead.

---

## Build first — quill-written title

Session 23 already named this and shelved it, so picking the thread back up rather than
inventing something new. The masthead title (`SCHOOLWORK` on the cover, `The Schoolwork
Journal` on Today) animates as if being hand-written once per day, instead of just appearing.

Rough approach: an SVG text path or a sequence of small ink-blot/stroke reveal keyframes,
using `--ink-dark`/`--ink-medium` and `--font-hand`, gated so it only plays once per calendar
day (localStorage flag, same pattern as the existing ritual `seenThisSession` gate but keyed
to a date string instead of a session boolean). Keep it under ~1s — this is a once-a-day grace
note, not a centerpiece.

## Build second — aging leather

The cover's leather gains a very slight worn look over real usage — a softened corner, a
faint mark, a spine crease — tied to something simple like total days the app's been opened,
read from localStorage. Start with ONE subtle marker (e.g. a soft radial gradient "handling
mark" near the corner where the hand grips) rather than designing a whole wear system at
once. Cosmetic only — no functional read on this value anywhere else.

---

## Queued, not detailed yet

- **Seasonal/time-of-day tint** — extend the existing candlelight toggle to nudge gently with
  real season/time, keeping the manual override as-is (never force it).
- **Paper grain / dust motes** — faint drifting-particle or grain overlay in candlelight mode.
  Easy to overdo — if you build this, err toward barely-there and check it doesn't fight the
  existing candle-flicker animation for attention.
- **Handwriting jitter** — small per-character rotation/baseline offset on font-hand text
  (labels, year, subject counts) via nth-child CSS, so it reads as handwritten rather than
  just a cursive font.
- **Dog-ear on overdue cards** — a folded-corner graphic replacing/joining the current
  colour-only overdue treatment.
- **Bookmark ribbon** — marks "today" or last-viewed page.
- **Per-subject chapter icons** — small ink-line icon per subject next to the roman numeral
  on the cover's chapter list, same crosshatch style as the hand illustration.
- **"New volume" ceremony** — a closing ritual at term/semester end, "Vol. I" becomes "Vol.
  II" on the existing masthead.
- **Personal signature on the cover** — small font-hand line, e.g. "kept by William Grant."
- **Marginalia** — occasional flavour text in the margins. Real risk of getting annoying if
  it fires often or repeats — if you build this, make it rare and easy to permanently turn
  off.

Pick order isn't load-bearing here — these are independent of each other, so build whichever
one you feel like next.
