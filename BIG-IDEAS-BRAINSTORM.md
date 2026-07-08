# Big Ideas — Multi-Session Brainstorm

Different brief from `FEATURE-BRAINSTORM.md`. That one optimised for small, fast, closes-a-
real-gap items. This one is the opposite: big, ambitious, genuinely multi-session builds,
picked for what they'd actually teach you while there's no client on the clock. Some of these
change the shape of the app. That's the point.

Ordered by how much I'd actually push you toward each, not alphabetically.

---

## 1. Move off localStorage onto Supabase (real database + auth)

**The one I'd start with.** Everything else big on this list either needs this first or gets
much better once it exists. It's also the exact stack Produlogic builds client apps on —
Next.js + Supabase + auth + RLS — so time spent here isn't just for this app, it's the same
muscle you'd use on a real client build.

**What it actually involves** (rough phases, each is realistically its own session or two):
- Design the schema — `assignments`, `subjects`, `checkpoints` as real tables instead of one
  blob in localStorage. Decide what's a foreign key vs. a JSON column.
- Auth — even dead-simple, single-user login. This is also where you'd learn Row Level
  Security (RLS): the rule that says "only I can see my own rows," which is the security
  model every Produlogic client app runs on.
- Write a one-time import script that reads your existing localStorage export (the
  backup/restore JSON already built) and pushes it into the new tables — so you don't lose
  the data you've already got.
- Rewrite every `loadAssignments()`/`saveAssignments()` call to hit Supabase instead of
  localStorage. This touches almost every page — it's the biggest single-session chunk here.
- Test the edge cases: what happens offline, what happens on a slow connection, what a failed
  write looks like to the user.

**What it unlocks once it's done**: real backup (no more manual JSON export), access from
your phone AND laptop with the same data, and every idea below in section 2.

**Cost**: Supabase's free tier covers a single-user hobby project like this comfortably — this
one's free.

---

## 2. Things that get much bigger once Supabase exists

### Photograph a worksheet, auto-fill the assignment
Take a photo of a handout or task sheet, an AI vision call reads it and pre-fills subject,
title, due date — you just check it and hit save instead of typing it all in. Needs Supabase
Storage for the photo plus a real AI API call to read it (Claude's vision, or an OCR service).
Genuinely impressive to demo, and directly useful for how you actually get assignments (paper
handouts, screenshots, Te Kura portal pages).

**Cost**: real, ongoing — a few cents per scan, adds up with use but isn't scary at hobby
scale. Your call to spend since it's your project, not a client's — just go in knowing it's
not free.

### Multi-device sync, properly
Not really a separate build — it's what you get automatically once data lives in Supabase
instead of one browser's localStorage. Worth calling out on its own because it's the thing
that currently makes "add an assignment on my phone at school" impossible.

### Shared visibility with someone else
Once there's real auth, you could let a specific other person (a study buddy, a parent) see
read-only progress on a subject, or share a checklist. Bigger scope — needs a permissions
model, not just "everyone sees everything" — but it's the one that makes "others go along as
well" (the exact thing localStorage couldn't do, flagged back in the original research doc)
actually possible.

### Push notifications for due-soon assignments
"Essay due tomorrow" as an actual phone notification, not just a red banner you see next time
you open the app. Needs a server-side trigger (a Supabase Edge Function running on a
schedule) — this is the one item here that needs backend logic beyond just a database.

---

## 3. Big, but don't need Supabase — can start any time

### Voice input for adding assignments
You dictate constantly — this is the one idea on this whole list built directly around how
you already work. Web Speech API (or a proper transcription API) takes "add an essay for
English due next Friday," and natural-language parsing turns that into subject=English,
title=Essay, dueDate=<next Friday>, pre-filling the add form instead of you typing it.
Multi-session because the parsing is the hard part — dates said in plain English are messier
to extract reliably than they sound.

### An AI study assistant baked into the app
Describe an assignment in a sentence, AI suggests a checkpoint breakdown (the sub-steps) for
you instead of you typing each one. Could grow into: ask it questions about how to approach a
task, get study tips per subject. This is the idea most likely to actually change how useful
the app is day-to-day, not just how impressive it looks. Real API cost, same as the scanning
idea above.

### Make it a proper installable app (PWA)
Add a web app manifest + service worker so it installs to your phone's home screen, works
offline, and (combined with Supabase) syncs once you're back online. This is the "feels like
a real app, not a website" upgrade, and it's a genuinely valuable thing to have actually built
once — offline-first design is a real, transferable skill, not busywork.

### A real insights layer, past what Stats already shows
Stats currently shows streaks, a heatmap, and per-subject completion. A deeper pass: what
time of day you're actually most productive (once Pomodoro logs real focus time — see session
28), which subjects consistently take longer than estimated, a rough "at risk of missing this"
flag based on how close to the deadline you tend to actually start things. This is a data
project more than a features project — closer to what a junior data analyst would build than
a typical app feature, which is exactly why it's worth doing once for the experience.

### A full theming engine
Not just candlelight/daylight — a real settings page: pick the leather colour, parchment
tone, font pairing, layout density, save it as your own preset. Less "backend skill," more
"can you build a genuinely flexible settings system without it turning into spaghetti" — a
different kind of hard than the data-heavy ideas above, worth having in the mix so this list
isn't all backend.

---

## 4. More speculative — mention because you said go big, not because I'd start here

- **A "study room" presence feature** — once real-time data exists (Supabase Realtime), show
  who else (a friend group, if you ever wanted that) is actively studying right now. Social
  features are a different kind of complexity than anything else here — worth knowing it's
  possible, not worth prioritising for a solo tracker.
- **Friend leaderboards / streak comparisons** — same caveat as above. Fun if this ever
  becomes a shared tool with actual friends using it; low value as a solo app.

---

## If you want a straight answer on where to start

Supabase + auth, full stop. It's not the flashiest item on this list, but it's the one where
the skill transfers directly to real client work, and it's the floor every other big idea here
either needs or gets meaningfully better standing on top of. Everything else is genuinely
worth doing — this is just the order I'd actually do them in.
