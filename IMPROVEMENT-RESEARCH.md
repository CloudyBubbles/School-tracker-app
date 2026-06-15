# Schoolwork Tracker — Improvement Research & Roadmap

Research only. Nothing here is built yet. This is a map of what to improve, what your wanted features need, the order to do them in, and copy-paste prompts for the near-term work.

Scope assumptions (tell me if any are wrong):
- It stays a Next.js + Tailwind app.
- "Polish / smoother" is the near-term priority.
- The bigger features (checkpoints shared with others, upload + scan, time estimation) are long-term, as you said.
- Built by you through Claude Code, one step at a time.

---

## 1. Current state — honest snapshot

The whole app is one file: `app/page.tsx`, 462 lines. For what it does, it's well put together — clean Tailwind, sensible React state, the overdue / due-soon logic works, status cycling and the sidebar are solid. It doesn't feel clunky because it's badly made; it feels clunky in a handful of specific spots, listed below.

**The one constraint that shapes everything:** your data is saved in `localStorage` — the browser's own memory. That's perfect for a solo practice app, but it has a hard ceiling:
- It only exists in one browser on one computer. Clear your browser data and it's gone.
- No one else can see or add to it — so "others go along as well" is impossible on localStorage.
- You can't upload and store files in it in any real way.

So three of the things you want (sharing with others, upload + scan, anything synced) all sit on the far side of one bigger move: **switching from localStorage to a real database (Supabase).** That's the hinge this whole roadmap turns on. More on that in section 4.

---

## 2. Issues found (grounded in the actual code)

Graded by how much they hurt daily use. None are emergencies — it works.

### Polish / "clunky" (this is your near-term list)
| # | Issue | Where | Fix |
|---|-------|-------|-----|
| P1 | Validation uses a browser `alert()` popup — jarring and dated | `handleSubmit`, line 77 | Replace with a small inline red message under the empty field |
| P2 | **No way to edit an assignment.** Typo in a title or wrong due date = delete and re-add | (no edit function exists) | Add an Edit button that reopens the values in the form |
| P3 | **Delete has no confirmation** — one misclick and it's gone | `handleDelete`, line 92 | Add a quick "Are you sure?" confirm |
| P4 | Notes is a single-line input — long notes get cramped | line 359 | Make it a multi-line textarea |
| P5 | Clicking a subject in the sidebar only expands a mini-list; it doesn't filter the main list | `toggleSubject` | Make clicking a subject filter the main view to that subject |
| P6 | The Add form sits big and central above the list; daily use is mostly *looking*, not adding | layout | Make the form collapsible, or move it to a side/top bar |

### Small real bugs
| # | Issue | Why it matters | Fix |
|---|-------|----------------|-----|
| B1 | Dates parsed as `new Date("2026-06-20")` read as UTC midnight | In some timezones a due date can display one day early | Parse dates as local, or store the raw string consistently |
| B2 | IDs use `Date.now()` | Two assignments added in the same millisecond collide | Use `crypto.randomUUID()` |
| B3 | `globals.css` has a dark-mode background but the app is hard-coded light | Slight visual mismatch if the device is in dark mode | Pick one: support dark mode properly, or remove the dark rule |

### Code quality (matters before the big features, not now)
- **Everything is in one 462-line file.** Fine today. But once you add checkpoints, uploads, and scheduling, one file becomes a tangle. Before Phase 3, split it into pieces: `Sidebar`, `ProgressCard`, `AddForm`, `AssignmentList`, `AssignmentCard`, plus a `types.ts` and a small `storage` helper. This is boring but it's what stops the app turning to spaghetti later.

---

## 3. Your wanted features — what each one actually needs

### A. Checkpoints (split an assignment over time, tick them off as you go)
- **Solo version:** each assignment gets a list of sub-steps (checkpoints), each with a label and a done/not-done. The assignment's progress comes from how many checkpoints are ticked. **Needs:** a data-model change (an assignment gains a `checkpoints` list) + UI to add and tick them. Works on localStorage. **Effort: Medium. Impact: High** — this is the feature that makes it genuinely more useful than a to-do list.
- **"As others go along" version:** other people seeing and ticking checkpoints. **Needs the database + logins first** (section 4). Can't be done on localStorage.

### B. Input feature — upload work, scan it
- Upload a file (photo/PDF of your work) and have it "scanned" — read automatically.
- **Needs two things localStorage can't give you:** (1) real file storage (Supabase Storage or similar), and (2) a "scan" step, which means OCR or an AI vision model reading the file on a server. **Effort: High. Impact: High but advanced.** This is firmly post-database, and the scanning part costs money per scan (AI isn't free) — a Heath/Mike conversation, not a solo call.

### C. "How long will it take" + plan it out
- Estimate the effort for each assignment and spread the work across the days before it's due.
- **Two ways:** start simple — you type an estimate (e.g. "3 hours"), and the app spreads it across free days before the due date with a basic rule. Later — an AI suggests the estimate from the assignment details. **Needs:** the checkpoints/data foundation first; the AI version needs an API (cost again). **Effort: High. Impact: Medium.** This is the long-shot you flagged, and that's the right read.

---

## 4. The decision point everything hinges on

Three of your wants (shared checkpoints, upload + scan, AI estimation) all require leaving localStorage for **Supabase (a real database) + logins**, and two of them also need **paid AI calls**.

That makes this a real fork, not a coding detail:
- **Database + auth** = grind Stages 3–4. It's the natural next learning jump anyway, and it unlocks the whole top half of your wishlist.
- **AI scanning / AI estimates** = ongoing cost per use. That's money out, which under your trial guardrails is **Heath's call, and possibly Mike's** — not something to wire up solo.

So the honest framing: the polish (Phase 1) and solo checkpoints (Phase 3) you can grind on your own. Everything past that, loop Heath before you start — it changes the stack and the cost.

---

## 5. Recommended order

1. **Phase 1 — Polish.** Fix P1–P6 and the small bugs. Pure quality-of-life, all on localStorage. Makes it "smooth." *(Low effort, high daily impact.)*
2. **Phase 2 — Refactor into components.** Split the one big file. Boring, invisible, but it's the thing that makes Phases 3+ not painful. *(Medium effort, no visible change.)*
3. **Phase 3 — Solo checkpoints.** Add the checkpoints feature for yourself. *(Medium effort, high impact.)*
4. **Phase 4 — Database + logins (with Heath).** The jump to Supabase. Unlocks sharing and everything below. *(Big — grind Stage 3–4.)*
5. **Phase 5 — Upload + scan (with Heath, costs money).** File storage + AI reading. *(Big, paid.)*
6. **Phase 6 — Time estimation + planning.** Estimates and scheduling, simple first then AI. *(Big, long-shot.)*

Do them in order. Each one leans on the one before it.

---

## 6. Copy-paste Claude Code prompts (near-term only)

Run these one at a time in Claude Code, and check each in the browser before the next. After `/clear`, paste the orienting line from your `RESUME-NOTE.md` first so the fresh chat knows the project.

### Phase 1 — Polish (do these as separate prompts, check after each)

**1a — kill the alert, add inline validation:**
```
In my schoolwork tracker, replace the alert() validation in the add form. Instead, if subject, title, or due date is empty when I submit, show a small red message under each empty field and don't add the assignment. No popups.
```

**1b — add edit:**
```
Add the ability to edit an existing assignment. Put an Edit button on each assignment card. Clicking it loads that assignment's details back into the form so I can change them and save the update, instead of having to delete and re-add. Keep everything saving to local storage.
```

**1c — confirm before delete:**
```
Before deleting an assignment, ask me to confirm with a small "Delete this assignment?" confirmation so I can't lose one by misclicking.
```

**1d — notes textarea + subject filtering:**
```
Two small changes to my schoolwork tracker, keep everything else the same: (1) make the Notes field a multi-line textarea instead of a single line. (2) When I click a subject in the sidebar, filter the main assignment list to show only that subject, with a way to clear the filter and see all again.
```

**1e — fix the date timezone bug:**
```
There's a date bug: due dates are parsed as UTC so they can show one day early in my timezone. Fix the date handling so a due date always displays as the exact local calendar day I picked. Don't change anything else.
```

### Phase 2 — Refactor (one prompt, then test everything still works)
```
Refactor my schoolwork tracker for maintainability without changing how it looks or behaves at all. Split app/page.tsx into separate components — Sidebar, ProgressCard, AddForm, AssignmentList, AssignmentCard — and move the Assignment type into a types file and the localStorage read/write into a small helper. Keep every feature working exactly as it does now. After refactoring, confirm the app still builds and behaves identically.
```

### Phase 3 — Solo checkpoints
```
Add a "checkpoints" feature to each assignment. Each assignment can have a list of checkpoints (sub-steps), each with a short label and a done/not-done tick. I can add, tick, untick, and remove checkpoints on an assignment. Show the assignment's progress based on how many checkpoints are ticked (e.g. 2/5). Keep everything saving to local storage and keep all existing features working.
```

Phases 4–6 need the database and Heath's sign-off — no prompt here on purpose. When you're ready for Phase 4, start a fresh research pass on the Supabase migration specifically.

---

## 7. One-line summary

It's a solid app with a few clunky spots and a clear ceiling. Polish it (Phase 1), tidy it (Phase 2), add solo checkpoints (Phase 3) on your own — then everything bigger (sharing, scanning, AI planning) waits behind the database jump and a conversation with Heath, because it changes the stack and starts costing money.
