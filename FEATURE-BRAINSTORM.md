# Feature Brainstorm — Cosmetic + Functional

Requested as a wide, creative sweep of what could still be added — not a build plan, not
prioritised into phases like `IMPROVEMENT-RESEARCH.md`. That doc is also badly out of date
(it describes a single 462-line `app/page.tsx` — the app has since grown a stats page, an
archive page, per-subject pages, checkpoints, drag-reorder, a Pomodoro timer, and a lot more).
Section 1 below is a reality-check on what's already built, so the ideas after it don't
duplicate work that's already done. Sections 2–3 are the actual brainstorm.

---

## 1. What's already built (don't re-suggest these)

Checked directly against the current code, not against old docs:

**Assignment data/UI**: checkpoints (add/tick/remove, progress shown as "2/5"), priority
(Low/Med/High with a colour dot), edit-in-place, delete with a confirm step, per-assignment
notes (textarea, "read more" clamp for long ones), snooze (+1 day), drag-to-reorder with a
custom sort mode, start-date + a timeline progress bar, estimated-time field, a recurring
field (weekly/fortnightly/monthly).

**Views**: Today (due today / overdue / this week / coming up, a 7-day strip you can click
into, per-subject progress bars), per-subject chapter pages (sort by date/priority/custom,
show/hide done), Stats (current + best streak, 21-day heatmap, per-subject breakdown, recent
completions), Archive (grouped by subject, filterable, restore).

**Interaction/feel**: keyboard shortcuts (`q`/`a` to add, `/` to search, `Esc` to close),
swipe between subjects on mobile, a riffle page-turn transition between chapters, a 3D tilt on
assignment cards that follows the cursor, a staggered "scattered pages" entrance animation
per card, a wax-stamp "DONE" seal (both a permanent corner stamp and a one-off animated stamp
the moment something's marked done).

**Atmosphere**: candlelight/daylight theme toggle (with a flicker animation in candlelight),
sounds toggle with fully procedural Web Audio (book open/close ritual, typewriter click),
Pomodoro timer (floating pill, 25/10/5 presets, bell chime), backup/restore via JSON
export/import, a pinned free-text note per subject.

**The 3D cover**: full CSS-3D leather book with hinge-open animation, a hand-driven
open/close ritual with a grip hand + resting hand, and (as of today) a placeholder
articulated-finger rig — see `session-25-hand-rig-3d-research.md`.

This is a genuinely mature app for a solo passion project. The gaps below are real gaps, not
"this app is basic" — worth being clear about that distinction.

---

## 2. Loose threads already flagged, worth closing before new ideas

- **`recurring` doesn't actually do anything yet.** The field exists (weekly/fortnightly/
  monthly), it displays a ↻ icon, but nothing generates the *next* occurrence when a
  recurring assignment is marked done. Right now it's a label, not a feature.
- **`estimatedTime` is captured but never used.** You can type "2h 30m" on an assignment and
  it displays next to the title — nothing sums it, nothing uses it to plan a week. Same gap
  `IMPROVEMENT-RESEARCH.md` flagged as Phase 6, still open.
- **`playTypewriterClick()` in `sounds.ts` — I didn't find a call site for it** anywhere in
  the pages I checked. Either it's wired up somewhere I didn't look, or it's dead code left
  over from an earlier plan. Worth a 30-second check.
- **Session 23 explicitly deferred a list of ideas** and never came back to them: Canvas
  ink-bleed rendering, a quill-written title animation, "candlelight sync," and a garnish/
  easter-egg list — "fumble variant, overdue tell, small hours, paw print." I don't know what
  those last four fully meant (session 23 just names them), so I'm not reinventing them here —
  flagging that they're sitting there if you want to pick the thread back up rather than start
  fresh below.

---

## 3. New ideas — cosmetic (mood, texture, "feels like a real journal")

- **Aging leather.** The cover subtly wears over real time in use — a worn corner, a faint
  coffee ring, a crease at the spine — tied to days-used or entries-logged. A book that looks
  different in month three than day one, without you doing anything for it.
- **Quill-written title.** Session 23 already named this and shelved it: the masthead title
  animates as if hand-written with a quill once per day (ink spreading slightly into the
  parchment), instead of just appearing. Font-hand and the ink colour variables already exist
  for this.
- **Seasonal/time-of-day tint.** You're in Marlborough — real winter right now. Extend the
  existing candlelight toggle from a manual on/off into something that also nudges gently
  with the actual season/time (cooler light in a July evening, warmer in summer), keeping the
  manual override so it's never forced on you.
- **Paper grain / dust motes.** A very faint drifting-particle or film-grain overlay in
  candlelight mode — the kind of thing "cozy game" aesthetics lean on. Cheap, no new
  dependency, easy to way overdo — keep it barely-there if you try it.
- **Handwriting jitter.** Font-hand text (labels, the year, subject counts) gets a tiny
  per-character rotation/baseline offset instead of sitting in a perfectly uniform line — a
  common cheap CSS trick that makes "handwritten" text actually read as handwritten rather
  than just a cursive font.
- **A dog-ear on genuinely overdue cards.** Right now overdue is colour + text only. A small
  folded-corner graphic (the page you keep coming back to, worn from re-reading) is a more
  "journal" way to say the same thing.
- **A bookmark ribbon** marking "today" or wherever you last left off — draggable if you want
  to get fancy, static is fine too. Real journals have these; this one doesn't yet.
- **Per-subject chapter icons.** A small ink-line icon per subject (beaker, quill, compass —
  whatever fits), next to the roman numeral on the cover's chapter list, in the same
  crosshatch style as the hand illustration.
- **"New volume" ceremony at term's end.** The masthead already says "Vol. I, No. 1 · 2026" —
  a closing ritual at term/semester end (wax seal, "shelved," Vol. II begins) would give the
  app a natural renewal beat instead of running forever unchanging.
- **A personal signature on the cover** — "kept by William Grant" in font-hand, small, in a
  corner. Costs nothing, makes it unmistakably *your* journal and not a template.
- **Marginalia** — occasional small flavour text in the parchment margins, old-manuscript
  style. Flagging a real risk here: this is the one idea on this list most likely to become
  annoying fast if it fires often or says the same three things. If you try it, make it rare
  and easy to permanently dismiss.

---

## 4. New ideas — functional (actually changes how useful it is)

- **Make `recurring` real.** When a recurring assignment is marked Done, auto-create the next
  occurrence at +7/+14/+30 days. This is the highest-value item on this whole list because
  the data model already supports it — it's UI logic, not a redesign.
- **A real calendar/month view.** The week strip and the 21-day heatmap both show density over
  time, but neither shows a full month laid out spatially. For a *tracker*, seeing "this week
  is fine, next week has five things due" at a glance is the actual point of a calendar.
- **Tags, separate from subject/priority.** "Exam," "essay," "practical," "group work" — cuts
  across subjects, lets you filter "everything exam-related coming up" regardless of which
  subject it's in.
- **"What should I do right now."** A small widget that looks at priority + due date +
  estimated time + time of day and suggests one specific next task. This is the difference
  between a list of things and a tool that actually helps you decide — and it's the natural
  payoff for having bothered to fill in priority and estimated time at all.
- **Link the Pomodoro timer to a specific assignment.** Right now it's a floating, disconnected
  timer. Starting a focus session *from* an assignment card, and logging minutes against that
  assignment/subject, turns two already-built features into one that's genuinely more useful —
  and gives Stats something better to show than just completion counts.
- **A Sunday-night planning flow.** A guided "here's everything due this week, triage it" view
  — ties into the existing journal/ritual framing (a weekly ritual, not just a daily check-in)
  and gives you a reason to open it even in a light week.
- **`.ics` export.** One-way, pure client-side, no backend needed — due dates show up
  alongside whatever else you use for a calendar. Fits the localStorage-only constraint fine.
- **A print-friendly view.** "Print this week" or "print overdue" with print-specific CSS —
  minor, but a nice nod to "this is a journal" (a real one, you could tear a page out of).
  Also just genuinely useful before a day with no laptop.
- **An exam-specific countdown mode.** Te Kura/NCEA exams carry different weight than a normal
  assignment — a dedicated countdown treatment (escalating urgency as the date nears) separate
  from the everyday due-date list would reflect that they're not the same kind of thing.
- **A command palette (`Cmd+K`).** The app already has real keyboard-shortcut instincts (`q`,
  `a`, `/`, `Esc`) — a lightweight command palette is a natural next step for a single-user
  app built by someone who's already comfortable living in a terminal.
- **Light markdown in notes.** Checklists or bold/italic inside the notes textarea, since notes
  are already a first-class field with its own expand/collapse behaviour.

---

## 5. If you want a starting point

Highest ratio of "closes a real gap" to "effort": **make `recurring` actually regenerate**,
then **link Pomodoro to an assignment**. Both build on data/UI that already exists — no new
views, no new dependencies, no design decisions to make first.

Highest "makes it feel like a real object, not a web app": **quill-written title** (already
on the deferred list, already has the fonts/colours to do it) and **aging leather**.

Everything else here is genuinely optional — this is a passion project, not a client build,
so the right call is whichever one you'd actually enjoy building next.
