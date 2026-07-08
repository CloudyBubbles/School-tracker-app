# Session 30 — Roadmap, Bug Sweep & Idea Bank

**Type:** Planning / brainstorm + bug-fix session (not a feature build).
**Date:** 2026-07-08
**Who:** William

---

## ⚠️ Naming decision (read first)

`PROJECT-INSTRUCTIONS.md` already earmarks "Session 30" as the **Supabase migration + rewiring every page off localStorage**. That's a big, security-tier build — it deserves its own focused session, not to be jammed into a brainstorm.

**Proposed:** this planning/bug session is **Session 30**. The Supabase rewire becomes **Session 31** and runs on its own (Plan Mode + `ultrathink`, real data, back up first). If you'd rather keep 30 = Supabase, rename this file to `session-30a`.

---

## 1. Where the app actually is (verified against code, not docs)

**Built and working:**
- **Cover** — 3D leather book, hinge open/close with hand-rig ritual, live stats teaser, chapter list (roman numerals + urgency dots), subject add/remove, JSON backup/restore, candlelight + sounds toggles.
- **Today** — overdue / due-today / this-week / coming-up sections, 7-day strip, live search (`/`), quick-add (task vs assessment), per-subject progress, keyboard shortcuts.
- **Chapter pages** (`[subject]`) — full CRUD, checkpoints, priority, notes, start-date timeline bar, estimated-time, recurring, snooze, drag-to-reorder, sort, DONE wax stamp, mobile swipe between subjects, riffle page-turn.
- **Stats** — total done, current/best streak, focus time (total + per subject), 21-day heatmap, recent completions.
- **Archive** — completed items by subject, filter, restore.
- **Assessments** — assessment-kind items, "credits at stake" tally, target grade / standard code.
- **Cross-cutting** — Pomodoro linked to a specific assignment with real elapsed-minute logging → feeds Stats; recurring assignments actually regenerate; procedural Web Audio sounds; candlelight theming; quill-written title; permanent parchment stains.

**Persistence today: 100% localStorage.** `@supabase/supabase-js` is installed and `app/lib/supabase.ts` creates a client, but **nothing imports it** — zero pages use Supabase. Session 29's schema/RLS is live in William's personal Supabase project, but the app isn't wired to it yet.

**Most visible unfinished thing:** `RiggedHand.tsx` still renders **debug placeholder boxes** (labelled idx/mid/rng/pky/thb) on *every* cover open/close, because `ALWAYS_FULL_RITUAL = true`. Real per-finger art was never sourced.

---

## 2. Bug sweep — what was found and fixed

Full audit run (tsc clean before + after; two code-audit passes). **Fixed this session:**

1. **`storage.ts` — app-crash on corrupt data.** `loadAssignments()` did `JSON.parse` with no try/catch — one bad `assignments` value crashed *every* page on load. Now wrapped + array-guarded, falls back to `[]`.
2. **`storage.ts` — legacy/imported data crash.** Assignments missing `checkpoints` threw the moment you clicked edit/toggle. Now backfilled `checkpoints: a.checkpoints ?? []` at load (same treatment `priority` already had). This also de-risks JSON import.
3. **`subjects.ts` — same parse crash.** `getSubjects()` `JSON.parse` unguarded → now try/catch, falls back to defaults.
4. **`layout.tsx` — guaranteed hydration mismatch.** The candlelight/sounds inline script sets classes on `<html>` before hydration but `<html>` had no `suppressHydrationWarning`. Added.
5. **`PomodoroTimer.tsx` — timer kept running after close.** The "×" logged + closed but never called `setRunning(false)`, so it counted down invisibly and still rang the bell. Fixed.
6. **`assignments.ts` — "monthly" recurring drift.** Monthly used a fixed 28-day offset, drifting ~2–3 days earlier each cycle. Now uses a real calendar month (`setMonth`).
7. **Side-tab navigation flash (4 pages).** `handleTabNavigate` on Today, chapter, archive, assessments skipped `startTransition()` (only stats did it right), so tab nav could pop instead of fade. Added to all four.

**Deferred (documented, not yet done — real but not crash-risk):**
- Loading gate on Archive / Assessments / Stats — they flash "nothing here yet" before localStorage loads. Copy the `isLoading` pattern already in `journal/page.tsx`.
- `handleImport` (`page.tsx`) validates only the outer array, not each record. Mostly covered now by the load-time backfill, but a per-item sanitise is the proper fix.
- Cover rest-hand flash on 2nd+ visit (`page.tsx` stale `seenThisSession` guard vs `ALWAYS_FULL_RITUAL`).
- Minor refactors: shared date/sort helpers duplicated across pages; `sortMode`/form state not reset on chapter switch; `creditValue` `NaN` guard; dead `PageEnter.tsx` (never imported — safe to delete, flagged for your OK).

---

## 3. Roadmap — what's left, in priority order

**A. The big one — Supabase migration (Session 31).** One-time migration (JSON export → tables via real `subject_id` foreign keys) + rewire every page off `loadAssignments()`/`saveAssignments()` onto Supabase, with loading states + auth. Security-tier: Plan Mode + `ultrathink`, back up real data first. See the decision in §5 — the app doesn't *need* this, but it's the single best learning rep for the client stack.

**B. Finish before expand.** The rigged hand renders debug boxes on every open. Decide: source the real art, or cut it back to the simple hand. This is the most visible "unfinished" tell in the whole app.

**C. Functional backlog already on paper (not yet built):** tags, "what should I do now" widget, real month/calendar view, Sunday planning flow, `.ics` export, print view, exam countdown, command palette, markdown notes, make `estimatedTime` actually used, deeper insights (best time of day, at-risk flag).

**D. Cosmetic backlog already on paper (not yet built):** usage-tied aging leather, seasonal/time tint, paper grain/dust, handwriting jitter, dog-ear on overdue, bookmark ribbon, per-subject chapter icons, term-end "new volume" ceremony, signature on cover, marginalia, theming engine, canvas ink-bleed, candlelight sync.

---

## 4. Idea bank — NEW ideas (not already on paper)

### Functional (new)
- **NCEA credit + endorsement projection.** You already track "credits at stake." Go further: credits earned vs remaining vs at-risk, projected year-end total, and endorsement tracking (50 credits at Merit/Excellence → course + certificate endorsement). Real, specific value for an NZ student. **Top pick.**
- **Checkpoint templates.** "Essay" auto-adds plan → draft → edit → submit; "exam" adds revise → past-paper → review. Turns a 30-second setup into one click.
- **Daily load balancer.** Given `estimatedTime` + due dates, suggest how to spread work so nothing piles up the night before. (Different from "what now" — this is the *week*, not the *next action*.)
- **Data-health / repair panel** in settings — storage size, last backup date, one-click "repair data." Fits perfectly on top of the crash bugs just fixed; makes the app feel trustworthy.
- **Streak grace token.** One missed day doesn't nuke your streak. Small retention trick, big emotional difference.

### Cosmetic (new — all on-aesthetic)
- **Candle that burns down during a Pomodoro.** The candlelight candle physically shortens as the focus timer runs, gutters out when time's up. Merges two features you already have; high delight, low cost. **Top cosmetic pick.**
- **Wet ink that dries.** Newly-typed text starts glossy and settles to matte over ~1s. Micro-delight on every add.
- **Wax seal to "break" on a big assessment.** Sealing/unsealing ceremony for starting a major piece.
- **Pressed-flower / ticket-stub keepsake** on finishing a big assessment — a little memento appears on the page. The journal becomes a record, not just a tracker.
- **Blotting-paper undo.** Deleting shows an ink blot you can "blot away" to undo — themed undo affordance.

### Wild (new — flagged honestly)
- **Handwrite-to-text input.** You literally write in the journal (mouse/stylus/finger) and it OCRs to text. Deeply on-theme. Also a rabbit hole — see traps.
- **Year-end time-lapse.** "Flip through the year" — every page animating as it filled. A keepsake artifact at term/year end. Pairs with the "new volume" ceremony.
- **Ambient study soundscape** tied to candlelight (rain, fireplace, quill scratches) as a focus layer.
- **On-device AI checkpoint suggester.** Reads a new assignment title, suggests checkpoints + priority — kept in-browser to stay true to the local-first, no-backend character (privacy as a feature).

---

## 5. The one decision that shapes everything: localStorage vs Supabase

**Honest senior-dev read.** For a *personal, single-user* schoolwork tracker, localStorage is the right architecture — simpler, instant, offline, nothing to break. Supabase buys you multi-device sync + cloud backup + auth. Your JSON export/restore already covers "backup" crudely.

So the real reason to do it is **learning** — it's the exact Produlogic client stack (Next + Supabase + RLS + auth). As a rep, it's the most valuable thing you could build next. Just go in eyes-open: it's a real complexity jump (loading states everywhere, auth friction, offline breaks, migrating your real data).

- **Option A — Do the Supabase rewire (Session 31).** Best for learning; overkill for the app itself. My pick *if the goal is skill-building*.
- **Option B — Stay localStorage, build features/cosmetics instead.** Best for the app as a product; you keep shipping delight. My pick *if the goal is the app itself*.
- **Option C — Hybrid: localStorage stays the source of truth, add a thin Supabase "cloud backup" sync.** Gets you the learning rep + real backup without rewiring every read. Lower risk than a full migration.

**Pre-mortem:** if the full rewire (A) fails, the headline is "spent three sessions turning a working offline app into a half-working online one with auth friction." That risk is why C exists.

---

## 6. Open questions for William
(see chat — vision + vibe questions to steer what gets built next)

---

## 7. Next actions
- [ ] William picks the localStorage/Supabase direction (§5).
- [ ] Decide: finish or cut the rigged hand (§3B).
- [ ] Pick 2–3 from the idea bank (§4) to spec into the next build session.
- [ ] (Optional) clear the deferred bug backlog (§2) in a quick cleanup pass.

---

## 8. Verification (this session)
- `tsc --noEmit`: **clean** (exit 0) after all fixes.
- Lint: 11 pre-existing errors remain, all in files NOT touched this session — `app/page.tsx` (setState-in-effect x2, prefer-as-const x3, `<img>` warning) and `test-app.js` (require import). Left alone: `app/page.tsx` holds the delicate 3D cover logic, so fix as a separate careful pass.
