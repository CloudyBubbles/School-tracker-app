# Session 16 — Completion Tracking, Drag to Reorder & Stats Page

You are working on a personal schoolwork tracker. Next.js 16 (App Router) + TypeScript +
Tailwind CSS 4. Warm leather journal aesthetic. localStorage-only — no backend.

## Aesthetic reference
CSS vars: `--parchment`, `--ink-dark`, `--ink-medium`, `--ink-light`, `--gold`,
`--font-serif` (Lora), `--font-display` (Playfair Display), `--font-hand` (Caveat).
Use inline styles — no Tailwind for the journal look.

## Current codebase state

```
app/types.ts              Assignment + Checkpoint interfaces
app/lib/assignments.ts    cycleAssignmentStatus(id) shared utility
app/lib/storage.ts        loadAssignments() / saveAssignments()
app/lib/dates.ts          parseLocalDate(str) — splits YYYY-MM-DD to avoid UTC bug
app/lib/subjects.ts       getSubjects() → Subject[] with id, name, colour
app/components/journal/SideTabs.tsx   fixed-right nav: Today | [subjects] | Archive
app/components/journal/ParchmentPage.tsx
app/journal/page.tsx         Today page
app/journal/[subject]/page.tsx   Chapter page
app/journal/archive/page.tsx
app/page.tsx                 Cover
```

Current `Assignment` interface (app/types.ts):
```ts
export interface Checkpoint { id: string; label: string; done: boolean; }
export interface Assignment {
  id: string; subject: string; title: string; startDate?: string;
  dueDate: string; status: "To do" | "In progress" | "Done";
  priority: "Low" | "Medium" | "High"; notes: string;
  checkpoints: Checkpoint[]; estimatedTime?: string;
  recurring?: "weekly" | "fortnightly" | "monthly";
}
```

Current `cycleAssignmentStatus` in app/lib/assignments.ts — sets next status, handles
recurring auto-create when Done, no completedAt logic yet.

Current SideTabs tabs array:
```ts
{ id: "__home", label: "Today", path: "/journal", colour: "#8a6040" },
...subjects.map(...),
{ id: "__archive", label: "Archive", path: "/journal/archive", colour: "#8a6040" },
```

---

## Session 16 — Five tasks

---

### Task 1 — Add `completedAt` and `order` fields to Assignment

In `app/types.ts`, add two optional fields:
```ts
completedAt?: string;   // YYYY-MM-DD set when status becomes "Done"
order?: number;         // for manual drag-to-reorder on chapter page
```

---

### Task 2 — Track `completedAt` in cycleAssignmentStatus

In `app/lib/assignments.ts`:

Add a helper at module scope:
```ts
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
```
(Local time, not UTC — deliberately mirrors how parseLocalDate works in reverse.)

In `cycleAssignmentStatus`, when mapping to `updated`:
- If the assignment being changed (`a.id === id`) and `nextStatus === "Done"`:
  → set `completedAt: todayStr()`
- If the assignment being changed and `nextStatus !== "Done"`:
  → set `completedAt: undefined` (clear it when unchecked)
- All other assignments: unchanged

---

### Task 3 — Drag to reorder on the chapter page

In `app/journal/[subject]/page.tsx`:

**3a. State**
Add:
```ts
const [draggingId, setDraggingId] = useState<string | null>(null);
```

Update `sortMode` type to `"date" | "priority" | "custom"`.

**3b. Sort logic update**
In `sortedAssignments` (the computed/memoised sort):
- `"date"` → sort by dueDate asc (existing behaviour)
- `"priority"` → sort by PRIORITY_ORDER then dueDate (existing behaviour)
- `"custom"` → sort by `order` asc; assignments with `order == null` go last (by dueDate)

**3c. Auto-detect custom order on load**
In `loadData()`, after computing the subject's assignments, if any assignment has
`order != null` and the current sortMode is `"date"`, call `setSortMode("custom")`.

**3d. Sort toggle UI update**
The existing "date | priority" toggle buttons — add a third button "· custom" that
appears only when `displayedAssignments.some(a => a.order != null)`.
When the user clicks "date" or "priority" while in "custom" mode: clear the `order`
field from all of this subject's assignments, save via `saveAssignments`, reload.

**3e. Drag handle + drag events on each card**
Each assignment card's outer div:
- `draggable={true}`
- `onDragStart={() => setDraggingId(a.id)}`
- `onDragEnd={() => setDraggingId(null)}`
- `onDragOver={(e) => e.preventDefault()}`
- `onDrop={(e) => { e.preventDefault(); handleDropOnCard(a.id); }}`
- When `draggingId === a.id`: add `opacity: 0.4` and `cursor: "grabbing"` to the card

Inside the card (left edge, before the title area), add a drag handle:
```tsx
<div
  style={{
    fontSize: "13px",
    color: "var(--ink-light)",
    opacity: 0.35,
    cursor: "grab",
    paddingRight: "8px",
    flexShrink: 0,
    userSelect: "none",
    lineHeight: 1,
    alignSelf: "center",
  }}
>
  ⠿
</div>
```

**3f. handleDropOnCard function**
```ts
const handleDropOnCard = (targetId: string) => {
  if (!draggingId || draggingId === targetId) return;
  // displayedAssignments is the current subject's rendered list
  const reordered = [...displayedAssignments];
  const fromIdx = reordered.findIndex(a => a.id === draggingId);
  const toIdx   = reordered.findIndex(a => a.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return;
  const [moved] = reordered.splice(fromIdx, 1);
  reordered.splice(toIdx, 0, moved);
  // Assign sequential order values
  const withOrder = reordered.map((a, i) => ({ ...a, order: i }));
  // Merge back into the full assignments array and save
  const all = loadAssignments();
  const orderMap = Object.fromEntries(withOrder.map(a => [a.id, a.order]));
  const merged = all.map(a => a.id in orderMap ? { ...a, order: orderMap[a.id] } : a);
  saveAssignments(merged);
  setSortMode("custom");
  setDraggingId(null);
  loadData();
};
```

---

### Task 4 — Stats page (new file)

Create `app/journal/stats/page.tsx` — a full page following the same structure as
the archive page (motion.div + ParchmentPage + SideTabs as sibling).

**Navigation**: same page-transition pattern as archive.
- Page enters with `initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}`
- `endTransition()` on mount
- `handleClose` navigates to `/journal` with `{ opacity: 0, x: -10 }` fade-out animation
- SideTabs with `activeSubjectId="__stats"`

**Computed stats** (all from `loadAssignments()` + `getSubjects()`):

```ts
const all = loadAssignments();

// Total done all-time
const totalDone = all.filter(a => a.status === "Done").length;

// Assignments with completion timestamps
const completedWithDate = all
  .filter(a => a.completedAt)
  .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!));

// Unique completion date strings, sorted asc
const completionDates = [...new Set(completedWithDate.map(a => a.completedAt!))].sort();

// Streak helper — today's date string
const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`;

// Current streak: count consecutive days backward from today
// Walk back from today; if a date has completions, increment, else break
function calcCurrentStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let streak = 0;
  const d = parseLocalDate(today);
  // If nothing completed today, start from yesterday
  if (!set.has(today)) d.setDate(d.getDate() - 1);
  while (true) {
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!set.has(ds)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Best streak: longest consecutive run
function calcBestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  let best = 1, current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = parseLocalDate(dates[i - 1]);
    prev.setDate(prev.getDate() + 1);
    const prevNext = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,"0")}-${String(prev.getDate()).padStart(2,"0")}`;
    if (dates[i] === prevNext) { current++; best = Math.max(best, current); }
    else current = 1;
  }
  return best;
}

const currentStreak = calcCurrentStreak(completionDates, todayStr);
const bestStreak = calcBestStreak(completionDates);

// Subject breakdown: total assignments + done count per subject
const subs = getSubjects();
const subjectBreakdown = subs.map(sub => {
  const subAll = all.filter(a => a.subject.toLowerCase() === sub.name.toLowerCase());
  const done = subAll.filter(a => a.status === "Done").length;
  return { sub, done, total: subAll.length };
}).filter(s => s.total > 0);

// 21-day heatmap
const heatmap = Array.from({ length: 21 }, (_, i) => {
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - (20 - i)); // index 0 = 20 days ago, 20 = today
  const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const count = completedWithDate.filter(a => a.completedAt === ds).length;
  return { ds, count };
});

// Recent completions — last 5
const recentCompletions = [...completedWithDate]
  .reverse()
  .slice(0, 5);
```

**Page layout** (all inline styles, journal aesthetic):

```
← today                    [back link]

Field Notes                [var(--font-hand), 13px, ink-light]
Your Progress              [var(--font-display), 32px, ink-medium, bold]
──────────────────────

[ 42 ]     [ 3 ]     [ 7 ]
all time   day       best
           streak    streak

──────────────────────
by subject
  English  ████████░░░░  14 / 20
  Maths    █████░░░░░░░   8 / 20

──────────────────────
last 21 days
  ■ ■ □ ■ ■ ■ □ □ ■ ■ □ ■ □ □ ■ ■ □ □ ■ ■ ■

──────────────────────
recently completed
  • Essay plan — due 22 Jun  (English)
  • Chapter 3 notes — due 21 Jun  (Maths)
```

Specific style details:
- Stats row: three items side by side (`display: flex, gap: 24px, justifyContent: center`).
  Each item: large number in `var(--font-display)` 40px `var(--ink-medium)`, label below
  in `var(--font-hand)` 11px `var(--ink-light)`. Streak items show `🔥` emoji before
  the number if > 0.
- Subject bars: same style as Today page's subject progress bars (`height: 3px`,
  coloured fill, `opacity: 0.55`). Show subject name (hand font, subject colour) and
  `X / Y` on right.
- Heatmap squares: `width: 16px, height: 16px, borderRadius: 2px`.
  Has completions → `background: rgba(140,100,60,0.55)`.
  Empty → `background: rgba(140,100,60,0.1)`.
  Today's square gets a subtle border: `outline: 1px solid rgba(140,100,60,0.4)`.
  Laid out in a row with `display: flex, gap: 3px, flexWrap: wrap`.
- Recent completions: serif 13px, strikethrough on title, hand font 11px for date +
  subject, `opacity: 0.65`.

Empty state (totalDone === 0):
```
<p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "13px",
  color: "var(--ink-light)", textAlign: "center", marginTop: "48px" }}>
  No completed assignments yet — they'll appear here once you've crossed one off.
</p>
```

---

### Task 5 — Add Stats tab to SideTabs

In `app/components/journal/SideTabs.tsx`, add to the `tabs` array after `__archive`:
```ts
{ id: "__stats", label: "Stats", path: "/journal/stats", colour: "#8a6040" },
```

`displayCount` for `__stats` → 0 (same as archive). No change needed to the existing
displayCount logic — the fallback `counts[tab.id] ?? 0` already returns 0 for unknown ids.

---

### Task 6 — Add "view all stats →" link to Today page

In `app/journal/page.tsx`, immediately after the closing `</div>` of the
`subjectProgress.length > 0` section (around line 995, just before the PageStack div),
add:

```tsx
{subjectProgress.length > 0 && (
  <button
    onClick={() => handleTabNavigate("/journal/stats")}
    style={{
      background: "transparent",
      border: "none",
      fontFamily: "var(--font-serif)",
      fontStyle: "italic",
      fontSize: "11px",
      color: "var(--ink-light)",
      cursor: "pointer",
      padding: "6px 0 0",
      display: "block",
      textAlign: "right" as const,
      width: "100%",
    }}
  >
    view all stats →
  </button>
)}
```

---

## Constraints

- No new npm packages — HTML5 drag-and-drop API only
- `parseLocalDate(str)` for all date parsing — never `new Date(dateStr)` directly
- `color-scheme: light` + `WebkitTextFillColor` on any text inputs
- SideTabs must be a sibling to (not inside) the motion.div on each page
- Stats page: `handleClose` navigates to `/journal` (Today), not the cover

## Files to touch

1. `app/types.ts` — add `completedAt?` and `order?`
2. `app/lib/assignments.ts` — completedAt tracking in cycleAssignmentStatus
3. `app/journal/[subject]/page.tsx` — drag to reorder
4. `app/components/journal/SideTabs.tsx` — add Stats tab
5. `app/journal/stats/page.tsx` — CREATE new file
6. `app/journal/page.tsx` — add "view all stats →" link
