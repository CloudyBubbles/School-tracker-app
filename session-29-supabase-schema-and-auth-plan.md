# Session 29 — Supabase Schema + Auth (the foundation, before any app code changes)

Schema and auth are the two things produlogic-code's own rules say never go through on
vibes — plan first, confirm, then build. This is that plan. Nothing here gets built until
you've got a real project to point it at (see "Do this first" below) and you're happy with
the shape of it.

---

## Do this first — only you can do this part

The Supabase MCP connected in this chat is wired to the Produlogic org account, not your new
personal one — that's a different login, so I can't create or manage a project inside your
account through it. This part's on you, and it's quick:

1. Log into your new Supabase account → **New Project**.
2. Name it something like `schoolwork-tracker`.
3. Set a database password — **save it somewhere real (a password manager), not just in your
   head.** You won't need it often, but when you do, there's no "forgot password" recovery for
   it — it's a database credential, not a login.
4. Region: `ap-southeast-2` (Sydney) is the closest to NZ and what the Produlogic org's own
   projects use — no real reason to pick differently.
5. Once it's created, go to **Project Settings → API** and grab two values: the **Project
   URL** and the **`anon` / `publishable` key**. Paste both to me (or to whoever builds this).
   These two are *meant* to be public — they're what your app's own browser code uses to talk
   to Supabase, same as any public API endpoint. **Do not grab or paste the `service_role`
   key** — that one's a master key that bypasses all security rules; it never belongs in
   client code or in a paste to anyone, it lives only in a server-side secret if it's ever
   needed at all (this app won't need it).

That's it from you for this part. Once I've got the URL + anon key, the rest below is ready
to go.

---

## The schema

Three tables. Straight translation of `Assignment`/`Subject`/`Checkpoint` from `types.ts`,
with one real change: checkpoints become their own table instead of a nested array, and
`subject` stops being a matched-by-name string and becomes a real foreign key. Right now the
app matches subjects to assignments by comparing lowercased name strings everywhere
(`a.subject.toLowerCase() === sub.name.toLowerCase()`) — that's the kind of thing that works
fine in a localStorage blob and is exactly what a real foreign key exists to fix properly.

```sql
create table subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  colour text not null,
  created_at timestamptz default now()
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  subject_id uuid references subjects(id) not null,
  title text not null,
  start_date date,
  due_date date not null,
  status text not null default 'To do',
  priority text not null default 'Medium',
  notes text not null default '',
  estimated_time text,
  recurring text,
  completed_at date,
  sort_order int,
  kind text not null default 'task',
  credit_value int,
  target_grade text,
  standard_code text,
  focus_minutes int not null default 0,
  created_at timestamptz default now()
);

create table checkpoints (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) on delete cascade not null,
  label text not null,
  done boolean not null default false,
  sort_order int
);
```

Two judgment calls worth flagging:

- **Checkpoints as a real table, not a JSON column.** A JSONB column would be less work (no
  join needed, matches today's nested-array shape exactly) — genuinely a valid choice. I'd
  still pick the real table here specifically because you said you want to learn from this,
  and foreign keys + joins are the actual relational-database skill worth having built once.
  If you'd rather ship faster and keep checkpoints as JSONB, say so — it's a smaller diff.
- **`order` became `sort_order`.** `order` is a reserved word in SQL — needs quoting
  everywhere if kept as-is. Renaming it once now is less annoying than quoting it forever.

---

## Row Level Security — the part that makes multi-device access safe

Every table gets the same rule: **you can only see, insert, update, or delete rows where
`user_id` matches whoever's actually logged in.** This is enforced by the database itself, not
by app code remembering to filter correctly — the security is real. even if a bug in the
Next.js code forgot to filter by user, the database would still refuse to hand back anyone
else's rows.

```sql
alter table subjects enable row level security;
alter table assignments enable row level security;
alter table checkpoints enable row level security;

create policy "own subjects only" on subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own assignments only" on assignments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own checkpoints only" on checkpoints
  for all using (
    auth.uid() = (select user_id from assignments where id = assignment_id)
  ) with check (
    auth.uid() = (select user_id from assignments where id = assignment_id)
  );
```

`checkpoints` doesn't have its own `user_id` column — it proves ownership through the
assignment it belongs to. Same end result, one less column to keep in sync.

---

## Auth — the pick

**Email + password.** Reasoning: it's the most standard pattern, it's what you're most likely
to see again on real client work, and Supabase Auth handles the hard parts (hashing,
sessions, tokens) — you're not writing any of that yourself. Magic-link (no password, just an
emailed login link) is a real alternative if you'd rather skip passwords entirely for a
single-user app — smaller UX surface, slightly less standard to build against. My pick stands
unless you'd rather go magic-link; either is a small change at the auth-UI level, doesn't
change anything about the schema or RLS above.

---

## Migrating your existing data

The backup/export feature already built (Export JSON, on the cover page) is the exact input
a one-time migration script needs. Rough shape: read that JSON, sign in (or create your one
account), insert each subject, then each assignment (tagged with the new subject's real id
instead of matching by name), then each assignment's checkpoints. Runs once, by hand, not
part of the app itself.

---

## Order of operations from here

1. You create the project + grab the URL/anon key (above).
2. Confirm the schema/RLS/auth choices above, or flag changes.
3. **Session 30** (next, not this one): install `@supabase/supabase-js`, add the client setup
   + `.env.local` (confirm it's gitignored — it already is per this repo's `.gitignore`), run
   the schema, write the migration script, then rewire the pages off `loadAssignments()`/
   `saveAssignments()` onto real Supabase calls. That's the big, multi-page session — this one
   was just the foundation underneath it.

## What could break (flagging now, not fixing yet)

- Every page currently reads localStorage **synchronously** — Supabase calls are asynchronous
  network requests. Every page that assumes data is "just there" on render needs a loading
  state added. Not hard, but it's a real, repeated change across pages, not a one-liner.
  Sessions 26+ already added loading/empty-state patterns in a couple of places (Today page
  has `isLoading`) — that pattern extends everywhere once this lands.
