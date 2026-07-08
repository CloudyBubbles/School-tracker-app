# Schoolwork Tracker — Project Context

A personal leather-journal-aesthetic schoolwork tracker built as a passion project. localStorage only. No backend, no auth, no deployment concerns — just the app.

## Stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Framer Motion** — `animate` (standalone import) + `motion.*` components + `useRef` with imperative `animate(ref.current, ...)`
- **localStorage** for all persistence
- **Web Audio API** for sounds (`app/lib/sounds.ts`)

## Key files

| File | What it does |
|---|---|
| `app/page.tsx` | Cover page — 3D leather book, auto-opens on mount, "Open Journal →" zooms into Today |
| `app/journal/page.tsx` | Today page (main view) |
| `app/journal/[subject]/page.tsx` | Per-subject assignment list |
| `app/layout.tsx` | Root layout — `perspective: "1200px"` on wrapper div. Do NOT add more perspective inside pages. |
| `app/lib/sounds.ts` | `playBookOpen()`, `playTypewriterClick()` — Web Audio API, no files |
| `app/lib/storage.ts` | Assignment CRUD — localStorage |
| `app/lib/subjects.ts` | Subject CRUD — localStorage |
| `app/components/PageTransitionProvider.tsx` | Dark overlay (#0e0601) — `startTransition()` fades it in, `endTransition()` clears it |
| `app/components/RiffleOverlay.tsx` | Chapter navigation parchment strips |
| `app/components/journal/PageStack.tsx` | Decorative 3-layer parchment stack, bottom of interior |
| `app/components/journal/RiggedHand.tsx` | Session 25 — articulated grip-hand rig (placeholder pieces over the real hand.png; see session-25 doc) |
| `public/hand.png` | Pen-and-ink hand illustration (1536×1024) — overlaid on the book cover, palm-down dorsal view |

## CSS custom properties (globals.css)

`--parchment`, `--parchment-dark`, `--ink-dark`, `--ink-medium`, `--ink-light`, `--gold`, `--font-serif`, `--font-display`, `--font-hand`

## Architecture decisions already made — don't undo these

**3D cover (app/page.tsx):**
- `perspective: "1200px"` lives on the layout wrapper — adding another inside the cover page compounds and distorts
- Cover is a `motion.div ref={coverRef}` with `transformStyle: "preserve-3d"`, `transformOrigin: "left center"`
- Dual-face: outer leather face + inner endpaper face both have `backfaceVisibility: "hidden"` + `WebkitBackfaceVisibility: "hidden"` (Safari fix)
- `animate(coverRef.current, { rotateY: -160 })` — standalone framer-motion `animate()` on a plain ref, not a motion component — this is intentional
- `bookRef` wraps the whole book div — `animate(bookRef.current, { scale: 4.5 })` drives the zoom on "Open Journal →"
- Hand image (`/public/hand.png`) is a child of the `bookRef` div with `zIndex: 10`, `pointerEvents: "none"` — no animation, just present, exits with the zoom

**Sounds:**
- Sound state is read via `document.documentElement.classList.contains("sounds-on")` at call time — not from React state — because the inline script in `<head>` sets the class before hydration

**Navigation:**
- `startTransition()` → dark overlay fades in → `router.push()` fires → overlay clears on new page mount via `endTransition()`
- Navigate mid-animation by firing the animation without `await`, then `setTimeout(300)` → `startTransition()` → `router.push()`

**Spring easing:** `[0.34, 1.56, 0.64, 1]` — used for scatter/settle animations (same as assignment card entrance)

## Current state

Sessions 1–29 done (corrected 2026-07-08 — this doc had drifted before). Session files are in the project root as `session-XX-name.md`. Always paste the relevant session file into the chat before starting a build session — it has the exact code changes needed.

Recent: 22 (hand illustration + zoom), 23 (hand-driven open/close ritual), 24 (full-articulation rig plan + 3D research, Track A vs Track B), 25 (3D research corrected + placeholder rig wired in — real per-finger art still not sourced, RiggedHand.tsx still animates debug-tab placeholders), 26 (assessments tracker page + functional backlog — built), 27 (cosmetic pass, quill-written title — built), 28 (Pomodoro linked to an assignment — plan written, not yet built), 29 (Supabase schema + RLS + auth plan — **done and confirmed live**: `subjects`/`assignments`/`checkpoints` tables created, RLS enabled with policies on all three, in William's own personal Supabase project, not the Produlogic org one).

**No longer localStorage-only** — this doc's opening line is now stale on that point. `@supabase/supabase-js` is installed, `.env.local` + `app/lib/supabase.ts` exist and point at William's personal project. The app's pages still read/write localStorage though — that rewiring is session 30, not done yet.

**Next up: session 30** — one-time migration script (existing JSON export → new tables via real `subject_id` foreign keys) + rewiring every page off `loadAssignments()`/`saveAssignments()` onto real Supabase calls with loading states.

## Workflow

- **Building**: paste `session-XX-name.md` → implement → verify quality bar → done
- **Planning/brainstorming**: chat freely, produce a new session file at the end
- **Design pass**: note it's a design session, reference what's on screen
- **Rules**: TypeScript strict — `tsc --noEmit` must be clean. No new dependencies without discussion.
