# Session 28 — Pomodoro Linked to a Specific Assignment

## What you want

Right now `PomodoroTimer` is a floating pill with no idea what you're working on — just a
countdown and a bell. Starting a focus session *from* an assignment card, and having the time
actually count toward that assignment (and show up in Stats), turns it from a decoration into
something that feeds the rest of the app.

## What I'll do, in order

1. **New file `app/lib/pomodoro-context.tsx`** — a `PomodoroProvider` + `usePomodoro()` hook,
   same pattern this repo already uses for `riffle-context.tsx` and
   `PageTransitionProvider.tsx`. Holds `linkedTask: { id, title } | null` and exposes
   `startFocusSession(task)` / `clearLinkedTask()`. Mount the provider once in `app/layout.tsx`,
   wrapping the existing tree.

2. **`app/types.ts`** — add `focusMinutes?: number` to `Assignment`. Optional, same
   "absent = 0" reasoning as `kind` from session 26 — no migration needed.

3. **`app/lib/assignments.ts`** — add `logFocusMinutes(assignmentId: string, minutes: number): void`.
   Loads assignments, adds `minutes` to that assignment's `focusMinutes` (defaulting the
   existing value to 0), saves. No-ops quietly if the assignment's been deleted since the
   session started — a focus session outliving its own task shouldn't crash anything.

4. **`app/components/journal/PomodoroTimer.tsx`** — keep the existing countdown mechanics
   exactly as they are (don't touch what already works). Add:
   - Read `linkedTask` from `usePomodoro()`.
   - `useEffect` watching `linkedTask`: when it changes to a new task, open the pill, reset to
     25 min, start running. This is deliberately a *watcher*, not a rewrite of the timer's own
     state — smaller change, lower risk.
   - When `linkedTask` is set, show "Focusing: {title}" in the header instead of "⏱ Focus
     Session".
   - On natural completion, on manual reset, and on the pill being closed while a linked
     session had time on the clock: compute elapsed minutes (`preset − remaining`, rounded),
     call `logFocusMinutes`, then `clearLinkedTask()`. Pausing alone doesn't log anything —
     only reset/close/completion/switching-tasks counts as "this session is over."
   - If `startFocusSession` fires while a *different* task is already linked and has elapsed
     time, log that task's partial time first, then switch — so time never silently vanishes
     when you jump straight from one assignment's focus button to another's.

5. **Assignment cards** — add a small "⏱ focus" trigger calling
   `startFocusSession({ id: a.id, title: a.title })`, next to the existing per-card actions:
   - `app/journal/[subject]/page.tsx` — alongside the existing snooze/edit/delete row.
   - `app/journal/page.tsx` and `app/journal/assessments/page.tsx` — alongside the status
     pill in the badge row (same row that already shows priority/checkpoints/credits).

6. **`app/journal/stats/page.tsx`** — one new figure: total focus time logged (sum of
   `focusMinutes` across all assignments), shown near the streak stats. If it reads well,
   fold a per-subject minutes total into the existing subject-breakdown loop too — same data,
   just another column.

## What could break

- **Unlinked/standalone use of the timer must still work exactly as today** — someone opening
  the pill directly (not from a card) gets `linkedTask === null` the whole time, and none of
  the new logging code should run for them.
- **Elapsed-time accuracy** — has to be measured from actual running time, not "did it hit
  zero," or a paused-and-abandoned session either loses real focus time or double-counts it.
- **Deleted assignment mid-session** — `logFocusMinutes` needs to no-op cleanly, not throw.
- **Switching tasks mid-session** — covered above; the fix is logging the outgoing task's
  partial time before switching, not silently dropping it.

## Files touched

`app/lib/pomodoro-context.tsx` (new), `app/layout.tsx` (mount provider), `app/types.ts`,
`app/lib/assignments.ts`, `app/components/journal/PomodoroTimer.tsx`,
`app/journal/[subject]/page.tsx`, `app/journal/page.tsx`, `app/journal/assessments/page.tsx`,
`app/journal/stats/page.tsx`.

## Quality bar

- [ ] Standalone Pomodoro use (no card clicked) behaves identically to today
- [ ] Clicking "focus" on a card opens the pill, shows the task title, starts at 25:00, running
- [ ] Letting it run to completion logs ~25 min against that assignment
- [ ] Stopping partway through (reset or close) logs the actual elapsed minutes, not 0 and not 25
- [ ] Starting a focus session on a second assignment while the first still has time on the
      clock logs the first assignment's partial time before switching
- [ ] Deleting the linked assignment mid-session doesn't throw when the timer tries to log
- [ ] Stats page shows a sensible total; per-subject minutes (if added) sum correctly
- [ ] `tsc --noEmit` clean
