# Supabase, Explained For This App

Written so this stands on its own — paste it to whoever/whatever you're handing the build to,
it doesn't assume they've read the rest of this project's history.

---

## First: Supabase and Vercel do different jobs. They're not alternatives.

This is worth being precise about, because they get mentioned in the same breath a lot and it
makes them sound like competing choices. They're not — they answer two completely different
questions:

- **Vercel answers: "where does my app's code run so people can visit it?"** It takes your
  Next.js pages and logic and serves them on the internet — fast, auto-built whenever you push
  code, no server to manage yourself. It's hosting.
- **Supabase answers: "where does my app's data live?"** A real database, a login system, file
  storage, live updates. It's the backend.

A deployed app almost always needs both, doing two different jobs at once — which is exactly
why Produlogic's own stack is "Vercel for hosting + Supabase for the backend," not one or the
other. Asking "Supabase or Vercel" is a bit like asking "should I get a fridge or a house" —
one lives inside the other, they're not competing for the same slot.

**The practical answer for right now: you don't need Vercel for this step at all.** Adding
Supabase to schoolwork-tracker doesn't require the app to be deployed anywhere. Supabase is a
database sitting on the internet — your laptop, running `npm run dev` exactly like today, can
talk to it over the internet the same way your browser talks to any website. Vercel only
becomes relevant later, if you want the app reachable at a real URL without your laptop running
the dev server. That's a separate, later decision — not a prerequisite for this one.

(Small honest caveat: Vercel has started offering its own database-adjacent products recently.
They exist. Supabase is still the more complete, purpose-built option for what this needs —
proper Postgres, auth, and row-level security all designed to work together — and it's what
Produlogic already standardises on, so building it here teaches the thing that transfers.)

---

## What's actually broken right now

Every assignment, subject, and checkpoint in this app lives in `localStorage` — a storage box
built into your browser. That's fine for a solo practice build, but it has a hard ceiling:

- **It's trapped in one browser on one device.** Open the app on your phone and it's a
  completely empty tracker — not synced, not the same data, just missing.
- **The only backup is the manual JSON export button.** No automatic backup. Clear your
  browser data or have a bad day with your laptop, and whatever you haven't manually exported
  is gone.
- **No one else can ever see any of it**, even read-only, because it's not reachable by
  anything except your one browser.

Supabase's job is to take the data out of the browser box and put it somewhere any of your
devices can reach — as long as they prove it's actually you (that's auth).

---

## What Supabase actually is — four pieces, and which ones this app needs

Supabase bundles four things. This app would realistically use three of them:

1. **A real database (Postgres).** Right now assignments/subjects/checkpoints are one JSON
   blob. In Supabase they'd become real tables — an `assignments` table, a `subjects` table —
   the same shape conceptually as a spreadsheet, except your app can query it directly:
   "give me every assignment due this week," "give me everything for English." **Yes, this
   app needs this — it's the whole point.**

2. **Auth (login).** A real login so the database knows which rows are yours. Paired with
   **Row Level Security (RLS)** — a rule enforced by the database itself, not just your app's
   code, that says "this row is only visible to the person who owns it." Even a single-user
   app benefits from this, because it's what makes multi-device access safe — your phone and
   laptop both log in as you, and only your data comes back. **Yes, this app needs this.**

3. **Storage (file uploads).** A place to store actual files — photos, PDFs. This app doesn't
   need this yet. It only matters if you build the "photograph a worksheet" idea from the big
   brainstorm doc. **Not needed for the core migration — a later, separate feature.**

4. **Realtime (live updates pushed to connected devices instantly).** Useful for things like
   "two people editing the same list and seeing each other's changes live." This app doesn't
   need it for a solo tracker. **Not needed unless you ever build the shared/collaborative
   idea from the big brainstorm doc.**

So: the actual migration is Database + Auth. Storage and Realtime are real Supabase features
this app simply isn't using yet — worth knowing they exist for later, not part of this build.

---

## What changes in the app, conceptually

Not a file-by-file plan yet — just the shape of it, so "sending this to an AI" starts from
the right mental model instead of jumping straight to code:

- Every place the app currently does `loadAssignments()` / `saveAssignments()` (reading from
  or writing to localStorage) gets swapped for a Supabase query instead. Same idea — "get my
  assignments," "save this assignment" — different plumbing underneath.
- A login screen gets added, gating the app so it's not wide open.
- A one-time script reads your existing localStorage data (via the backup/export feature
  that's already built) and pushes it into the new database, so nothing you've already
  entered gets lost in the switch.
- Everything else — the leather book, the animations, the sounds, the whole feel of the app —
  doesn't change. This is a plumbing swap underneath, not a redesign.

---

## The honest tradeoff

This is a real, multi-session undertaking — not a quick add. It touches almost every page,
because almost every page currently talks to localStorage directly. It's also free at this
scale (Supabase's free tier), and it's the one big idea on the list that directly transfers
to real client work, not just to this app.
