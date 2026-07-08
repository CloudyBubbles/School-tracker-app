# Session 31 — Supabase migration & rewire

**Type:** Build session (security-tier — auth + real data). **Enter Plan Mode. Use `ultrathink`.**
**Depends on:** Session 29 (schema + RLS + auth plan — already live in William's personal Supabase project).
**Goal:** Move the app off localStorage onto Supabase: real auth, a real data layer, real foreign keys, and a one-time migration of existing data. This is the learning rep for the Produlogic client stack.

---

## How to hand this to Claude Code
Paste this file. Also tell it to read `PROJECT-INSTRUCTIONS.md` (conventions + "don't undo these") and `session-29-supabase-schema-and-auth-plan.md` (the schema/RLS/auth source of truth). Then let it Plan-Mode the whole thing before writing code.

## SAFETY — do these BEFORE any code runs (non-negotiable)
1. **Export a JSON backup** from the cover page ("Export JSON"). Save it somewhere real. This is the migration input AND the rollback.
2. Work on a branch: `william/supabase-migration`. Never on `main`.
3. Confirm `.env.local` has the URL + anon key and is gitignored (it is). Never paste the `service_role` key anywhere.
4. This touches real schoolwork data. The migration is **additive** (inserts into empty tables) — it does not delete localStorage. Keep localStorage untouched until the Supabase version is verified working.

---

## Current state (what exists)
- Live tables: `subjects`, `assignments`, `checkpoints` (schema + RLS in session-29). Checkpoints are their own table; `subject` is now a real `subject_id` FK; `order` → `sort_order`.
- `app/lib/supabase.ts` — client already created from env. Nothing imports it yet.
- Data layer today (all localStorage, synchronous): `app/lib/storage.ts` (`loadAssignments`/`saveAssignments`/chapter notes), `app/lib/subjects.ts` (`getSubjects`/`saveSubjects`/`getSubjectColour`), `app/lib/assignments.ts` (`cycleAssignmentStatus`/`logFocusMinutes`).
- Types in `app/types.ts`: `Assignment` (nested `checkpoints: Checkpoint[]`, `subject` is a name string, `order?`), `Subject`, `Checkpoint`.

## The core refactor that ripples everywhere
`subject` stops being a name string matched by `a.subject.toLowerCase() === sub.name.toLowerCase()` and becomes `subject_id` (FK). Every match site changes. Grep for `.subject` and `toLowerCase()` before starting — there are many.

---

## Staged plan (build + verify one stage at a time — do NOT do it all in one shot)

### Stage 1 — Auth (security tier, Plan Mode)
- Email + password (session-29 pick). Supabase Auth handles hashing/sessions.
- New: `app/lib/auth.ts` (sign up / sign in / sign out / get session helpers), `app/(auth)/login/page.tsx` (or a modal on the cover).
- Gate the app: unauthenticated → login. Use Supabase's session listener; store nothing sensitive yourself.
- Verify: sign up a test user, sign in, refresh (session persists), sign out.

### Stage 2 — Data-access layer (mirror the old API, async)
- New: `app/lib/db/subjects.ts`, `app/lib/db/assignments.ts` — async functions that mirror today's names/shapes so page churn is minimal (`getSubjects()` → `async listSubjects()`, `loadAssignments()` → `async listAssignments()`, plus create/update/delete/cycleStatus/logFocusMinutes).
- All queries scoped by the logged-in user (RLS enforces it too, but filter in-query anyway).
- Reassemble the app's `Assignment` shape from the join: fetch assignments + their checkpoints, nest `checkpoints` back into each so the UI types don't all change. Map DB `sort_order`↔`order`, `subject_id`→resolve to whatever the UI still needs.
- Generate types: run `generate_typescript_types` (Supabase) into `app/lib/db/types.ts` so the DB shape is typed, not guessed.
- Verify: a scratch call logs real rows for the test user; `tsc` clean.

### Stage 3 — One-time migration script (run once, by hand)
- New: `scripts/migrate-localstorage.ts` (or a temporary hidden `/migrate` page — easier since it runs in the browser where localStorage lives).
- Shape: read the exported JSON (or `localStorage` directly) → for the signed-in user, insert each subject (keep old-id→new-uuid map) → insert each assignment with its real `subject_id` → insert each assignment's checkpoints. Idempotency guard so re-running doesn't duplicate.
- Verify against the JSON backup: subject count, assignment count, checkpoint count, and spot-check one assignment's dates/credits. **Show the counts before and after — do not assume.**

### Stage 4 — Rewire pages to async + loading states (one page per commit)
Order: Today (`journal/page.tsx`, already has an `isLoading` pattern to copy) → chapter (`[subject]/page.tsx`) → archive → assessments → stats → cover. Each page: swap the synchronous `load*` for the async `list*` in an effect, add the loading gate, handle the empty state, keep the existing UI. Verify `tsc` + a manual click-through after each.

### Stage 5 — Final verification
- `tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds.
- Full loop on a fresh sign-in: add / edit / complete / delete an assignment; toggle a checkpoint; run a Pomodoro and confirm focus minutes land in Stats; recurring regenerates.
- Sign out / sign in on a second browser → same data (the actual payoff of doing this).
- Only once all green: note that localStorage is now dead weight (leave it as a fallback for one release, then remove in a later cleanup).

## Known landmines (from session-29 + the code)
- Every page reads data synchronously today; Supabase is async. Missing loading gates = flashes of empty/wrong state. The Today page's `isLoading` is the reference pattern.
- RLS means "no session = no rows." If a page renders before auth resolves, it looks broken, not empty. Gate on auth first.
- `checkpoints` prove ownership through their assignment (no own `user_id`) — inserts must set `assignment_id` correctly or RLS rejects them.
- Don't delete localStorage data in the same session you first wire Supabase. Additive first, cleanup later.
