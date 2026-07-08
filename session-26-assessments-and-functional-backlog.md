# Session 26 — Assessments & Milestones + Functional Backlog

## Why this feature

Your friend's read: regular assignments and formally-assessed work (NCEA internals/externals,
big project milestones) get flattened into the same list right now, and the high-stakes stuff
is easy to lose in the routine stuff. This also folds in the "exam countdown" idea from the
brainstorm doc — same underlying problem, one feature covers both instead of two.

This is the headline build for this session. Everything else requested ("the functions and
core components") is listed as a sequenced backlog in Part B, not fully designed yet — same
split session 24 used for Track A (detailed, build now) vs Track B (researched, parked).

---

## Part A — Assessments & Milestones (build this first)

### Data model (`app/types.ts`)

```ts
export interface Assignment {
  // ...existing fields unchanged...
  kind?: "task" | "assessment";       // NEW. undefined/absent = "task" everywhere it's read
  creditValue?: number;               // NEW. NCEA credits — only meaningful when kind === "assessment"
  targetGrade?: "Achieved" | "Merit" | "Excellence";  // NEW, optional
  standardCode?: string;              // NEW, optional — e.g. "AS91098"
}
```

`kind` is optional on purpose: every assignment already in localStorage has no `kind` field,
and this stack has no migration step — so "absent = task" has to be the rule everywhere this
field is read, not just at creation. That's a genuine advantage of schema-less localStorage
here: no migration script needed, just a consistent default.

### Judgment call worth flagging: milestones aren't a third `kind`

Your friend said "assessments and milestones" — two words. I'm treating both as the same
`kind: "assessment"`, on the reasoning that what they actually share is "this matters more
than routine work, track it separately" — a milestone (e.g. "science fair project due") is
just an assessment-kind entry with `creditValue`/`targetGrade`/`standardCode` left blank.
Simpler data model, same UI benefit, one less kind to branch on everywhere.

If that's wrong — if milestones need to look/behave meaningfully differently from NCEA
assessments (different fields, different page, different card treatment) — say so and this
splits into a real third `kind`. My default assumption is they don't need that yet.

### New view — `app/journal/assessments/page.tsx`

Same shape as the existing Stats/Archive pages (same `ParchmentPage` + `SideTabs` wrapper,
same close/tab-navigate pattern). Shows:

- Every `kind === "assessment"` item across all subjects, sorted by due date
- A running tally: total `creditValue` across not-yet-done assessments — "23 credits at stake"
  is a genuinely useful NCEA-specific number nothing else in the app currently gives you
- Each card: title, subject, due date, credits (if set), target grade (if set), standard code
  (if set), status, and checkpoints reused as a requirements checklist (no new checkpoint
  system needed — same field, same UI, just read in this new context)
- Add to `SideTabs` and the cover's chapter-list-adjacent nav, same pattern as Stats/Archive

### Existing views — small addition, not a rebuild

Today page and per-subject pages: add one badge to the existing badge row (same row that
already shows priority dot / status pill / checkpoint count / estimated time / recurring icon)
when `a.kind === "assessment"` — something like a small ribbon icon + credit count, e.g.
"🎖 4cr". Reuses the existing badge-row pattern in both `journal/page.tsx` and
`journal/[subject]/page.tsx` rather than inventing new card layout.

### Add/Edit form

One new control at the top of both the add form (`journal/[subject]/page.tsx`) and the quick-
add form (`journal/page.tsx`): a Task/Assessment toggle. Default "Task" (today's behaviour,
unchanged). Selecting "Assessment" reveals three more fields — credit value (number input),
target grade (select: Achieved/Merit/Excellence), standard code (text, optional) — via
progressive disclosure. Routine task entry stays exactly as simple as it is today; the extra
fields only show up when they're relevant.

### Quality bar

- [ ] Every assignment created before this session (no `kind` field) still displays and
      behaves identically everywhere — this is the one that actually matters, since it's a
      silent-failure risk if missed
- [ ] New assessment-kind items show the 3 extra fields only when the toggle is set to
      Assessment
- [ ] Assessments page credit tally is correct and updates live as items are added/completed
- [ ] Assessment badge shows correctly in Today + subject views, doesn't break the existing
      badge row's wrapping on mobile
- [ ] Checkpoints, priority, snooze, drag-reorder — all unchanged, all still work on
      assessment-kind items (reused, not forked)
- [ ] `tsc --noEmit` clean

---

## Part B — Functional backlog (sequenced, not detailed yet)

In rough build order. None of these are designed in detail yet — this is the queue, not the
spec, same as session 24 kept Track B undetailed.

1. **Recurring auto-regeneration** — mark a recurring assignment Done, auto-create the next
   occurrence at +7/+14/+30 days. Data model's already there (`recurring` field exists,
   currently just a label). Smallest, highest-ratio item in the whole backlog.
2. **Pomodoro linked to an assignment** — start a focus session from an assignment card
   instead of the floating timer only, log minutes against that assignment/subject. Connects
   two already-built features; Stats gets something better than completion counts.
3. **Tags** — free-form, separate from subject/priority/kind. Filter "everything exam-related"
   across subjects.
4. **"What should I do right now"** — suggestion widget using priority + due date + estimated
   time + time of day. Do this *after* Assessments exists, since assessment weight should
   probably outrank a routine task's priority flag in the suggestion.
5. **Real calendar/month view** — bigger than the week strip/heatmap, shows a full month
   spatially.
6. **`.ics` export, print view, command palette, markdown-lite notes** — smaller, self-
   contained, any order, pick whichever sounds fun.

---

## Notes for whoever builds this

Paste this file into a fresh Claude Code session the same way session 22–25 got built. Given
today's mid-session collision (this chat and a parallel Claude Code session both touching
`page.tsx`/`RiggedHand.tsx` at once) — if you're planning to build this in Claude Code, it's
probably worth doing that in its own pass rather than while this chat is also mid-edit on
something else in the repo.
