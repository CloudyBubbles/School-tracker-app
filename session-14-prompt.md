# Session 14 — Tier 2: priority sorting, timeline bar, Today tab count, archive search

## Context
- Next.js 16 App Router · TypeScript · Framer Motion · localStorage only
- Aesthetic: parchment `#f4ead5`, `--font-serif` / `--font-display` / `--font-hand`, `--ink-dark` / `--ink-medium` / `--ink-light`
- All styling is inline styles. No Tailwind utility classes. No `--text-*` CSS variables.
- Session 13 must be complete before running this session (types.ts now includes `estimatedTime`, storage.ts includes chapter notes helpers, SideTabs accepts `counts` prop)

## Files to edit
1. `app/components/journal/SideTabs.tsx`
2. `app/journal/page.tsx` (Today page)
3. `app/journal/[subject]/page.tsx` (Chapter page)
4. `app/journal/archive/page.tsx` (Archive page)

---

## Task 1 — Today tab count in SideTabs

The "Today" home tab currently shows no count. Show the total active assignment count by summing all subject counts already passed in via the `counts` prop. No changes needed to parent pages.

**In `app/components/journal/SideTabs.tsx`**, update the count badge logic:

```tsx
{tabs.map((tab) => {
  // Compute the display count for this tab
  const displayCount = tab.id === "__home"
    ? Object.values(counts).reduce((sum, n) => sum + n, 0)
    : tab.id === "__archive"
      ? 0
      : (counts[tab.id] ?? 0);

  const isActive = tab.id === activeSubjectId || (tab.id === "__home" && activeSubjectId === null);
  return (
    <button key={tab.id} ...>
      {tab.label}
      {urgentIds.includes(tab.id) && ( /* existing urgency dot */ )}
      {displayCount > 0 && (
        <div style={{
          fontFamily: "var(--font-hand)",
          fontSize: "9px",
          color: tab.colour,
          opacity: 0.75,
          marginTop: "2px",
        }}>
          {displayCount}
        </div>
      )}
    </button>
  );
})}
```

Keep the existing urgency dot render exactly as-is. The count badge comes after it.

---

## Task 2 — Priority sorting on Today page

Within each time bucket (Overdue, Due Today, This Week, Coming Up), sort assignments so High priority floats above Medium above Low. Within the same priority, keep due date order (earliest first).

**Add a priority sort helper** at the top of `app/journal/page.tsx` (module scope, alongside `urgencyColour` etc.):

```ts
const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function sortByPriorityThenDate(assignments: Assignment[]): Assignment[] {
  return [...assignments].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime();
  });
}
```

**In `loadData()`**, wrap each bucket with this sort before calling setState:

```ts
setOverdue(sortByPriorityThenDate(od));
setDueToday(sortByPriorityThenDate(dt));
setThisWeek(sortByPriorityThenDate(tw));
setComingUp(sortByPriorityThenDate(cu));
```

Also apply it to `allActive` (for the week strip day tap panel):
```ts
setAllActive(sortByPriorityThenDate(all.filter((a) => a.status !== "Done")));
```

**Visual indicator** — add a small priority dot to the Overdue and Due Today card renders (they're bigger cards and can afford it). In the overdue card, add a tiny coloured dot to the left of the title (already has subject colour on the border — use priority colour for the dot):

In the overdue card `<div>` (the inner content div), add before the subject label:
```tsx
{a.priority === "High" && (
  <div style={{
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    background: "#b04040",
    marginBottom: "4px",
    opacity: 0.7,
  }} />
)}
```

For Due Today cards, do the same. For This Week and Coming Up, the existing colour-coded date text already conveys urgency — no extra dot needed.

---

## Task 3 — Sort toggle on Chapter page

Add a small sort control near the "show/hide done" toggle. Default is by due date (existing behaviour). Alternate is by priority (High first, then due date).

**Add state:**
```ts
const [sortMode, setSortMode] = useState<"date" | "priority">("date");
```

**Sort helper** (module scope, same as Today page):
```ts
const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
```

**Update `displayedAssignments`:**
```ts
const sortedAssignments = sortMode === "priority"
  ? [...assignments].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 1;
      const pb = PRIORITY_ORDER[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime();
    })
  : assignments; // already sorted by date from useEffect

const displayedAssignments = showDone
  ? sortedAssignments
  : sortedAssignments.filter((a) => a.status !== "Done");
```

**UI** — extend the existing show/hide done toggle row to include the sort control on the right:

```tsx
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
  {/* existing show/hide done toggle — left side */}
  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
    <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "11px", color: "var(--ink-light)" }}>
      {showDone ? "Showing all entries" : "Hiding completed"}
    </span>
    <span style={{ fontFamily: "var(--font-serif)", fontSize: "11px", color: "var(--ink-light)" }}>·</span>
    <button
      onClick={() => setShowDone(!showDone)}
      style={{
        background: "transparent",
        border: "none",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize: "11px",
        color: "var(--ink-light)",
        cursor: "pointer",
        padding: 0,
        textDecoration: "underline",
      }}
    >
      {showDone ? "hide done" : "show all"}
    </button>
  </div>

  {/* sort toggle — right side */}
  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
    <span style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", opacity: 0.7 }}>sort:</span>
    <button
      onClick={() => setSortMode("date")}
      style={{
        background: "transparent",
        border: "none",
        fontFamily: "var(--font-hand)",
        fontSize: "9px",
        color: sortMode === "date" ? "var(--ink-medium)" : "var(--ink-light)",
        cursor: sortMode === "date" ? "default" : "pointer",
        padding: 0,
        textDecoration: sortMode === "date" ? "underline" : "none",
        opacity: sortMode === "date" ? 1 : 0.6,
      }}
    >
      date
    </button>
    <span style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", opacity: 0.5 }}>/</span>
    <button
      onClick={() => setSortMode("priority")}
      style={{
        background: "transparent",
        border: "none",
        fontFamily: "var(--font-hand)",
        fontSize: "9px",
        color: sortMode === "priority" ? "var(--ink-medium)" : "var(--ink-light)",
        cursor: sortMode === "priority" ? "default" : "pointer",
        padding: 0,
        textDecoration: sortMode === "priority" ? "underline" : "none",
        opacity: sortMode === "priority" ? 1 : 0.6,
      }}
    >
      priority
    </button>
  </div>
</div>
```

---

## Task 4 — Start→due timeline bar on chapter assignment cards

When an assignment has a `startDate`, show a thin progress bar below the badge row indicating how far through the work window we are today. This gives instant "am I on track?" feedback.

Only show the bar when:
- `a.startDate` is set and valid
- `a.status !== "Done"` (no point showing progress on done items)

**Add a helper** (module scope):
```ts
function timelineProgress(startDate: string, dueDate: string): number | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = parseLocalDate(startDate);
  const due = parseLocalDate(dueDate);
  const total = due.getTime() - start.getTime();
  if (total <= 0) return null;
  const elapsed = today.getTime() - start.getTime();
  return Math.min(1, Math.max(0, elapsed / total));
}
```

**In the assignment card render**, after the badge row `</div>` and before the start date text, insert:

```tsx
{a.startDate && !isDone && (() => {
  const pct = timelineProgress(a.startDate, a.dueDate);
  if (pct === null) return null;
  // Colour: green when early (<50%), amber when getting close (50–80%), red when nearly due (>80%)
  const barColour = pct < 0.5 ? subject.colour : pct < 0.8 ? "#c8a050" : "#b04040";
  return (
    <div
      style={{
        height: "2px",
        background: "rgba(140,100,60,0.1)",
        borderRadius: "1px",
        overflow: "hidden",
        marginTop: "6px",
        marginBottom: "2px",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.round(pct * 100)}%`,
          background: barColour,
          opacity: 0.65,
          borderRadius: "1px",
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
})()}
```

The existing start date text line (`"started X"` / `"starts X"`) follows naturally below this bar — no changes needed to that block.

---

## Task 5 — Archive search / filter

Add a simple filter bar to the archive page so you can find completed assignments by title or subject.

**In `app/journal/archive/page.tsx`**, add state:
```ts
const [archiveQuery, setArchiveQuery] = useState("");
```

**Add the filter input** — place it after the rule `<div style={{ height: "1px"... }}` and before the count line:

```tsx
{/* Filter bar */}
<div style={{ position: "relative", marginTop: "10px", marginBottom: "4px" }}>
  <input
    type="text"
    value={archiveQuery}
    onChange={(e) => setArchiveQuery(e.target.value)}
    placeholder="filter completed..."
    style={{
      width: "100%",
      padding: "5px 28px 5px 8px",
      fontFamily: "var(--font-serif)",
      fontStyle: "italic",
      fontSize: "12px",
      background: "transparent",
      border: "1px solid rgba(140,100,60,0.18)",
      borderRadius: "3px",
      color: "var(--ink-dark)",
      outline: "none",
      boxSizing: "border-box" as const,
      WebkitTextFillColor: "var(--ink-dark)",
      colorScheme: "light" as const,
    }}
    onFocus={(e) => { e.target.style.borderColor = "rgba(140,100,60,0.35)"; }}
    onBlur={(e) => { e.target.style.borderColor = "rgba(140,100,60,0.18)"; }}
  />
  {archiveQuery && (
    <button
      onClick={() => setArchiveQuery("")}
      style={{
        position: "absolute",
        right: "6px",
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--ink-light)",
        fontSize: "14px",
        padding: 0,
        lineHeight: 1,
      }}
    >
      ×
    </button>
  )}
</div>
```

**Filter the grouped data** — when `archiveQuery` is non-empty, filter the displayed groups and their assignments:

In the render where `grouped.map(...)` is called, replace it with:

```tsx
{(() => {
  const q = archiveQuery.trim().toLowerCase();
  const filteredGroups = q
    ? grouped
        .map((g) => ({
          ...g,
          assignments: g.assignments.filter(
            (a) => a.title.toLowerCase().includes(q) || g.subject.name.toLowerCase().includes(q)
          ),
        }))
        .filter((g) => g.assignments.length > 0)
    : grouped;

  if (filteredGroups.length === 0) return (
    <p style={{
      fontFamily: "var(--font-serif)",
      fontStyle: "italic",
      fontSize: "13px",
      color: "var(--ink-light)",
      marginTop: "32px",
      textAlign: "center",
    }}>
      {q ? "nothing found" : "Nothing archived yet — completed assignments appear here."}
    </p>
  );

  return filteredGroups.map((group, gi) => (
    /* ...existing group render code, unchanged... */
  ));
})()}
```

Remove the existing `total === 0` empty-state block and the `grouped.map(...)` call — the IIFE above replaces both.

**Update the count line** to reflect filtered vs total:
```tsx
<div style={{ /* ...existing styles... */ }}>
  {archiveQuery.trim()
    ? `${grouped.reduce((s, g) => s + g.assignments.filter(a => a.title.toLowerCase().includes(archiveQuery.trim().toLowerCase()) || g.subject.name.toLowerCase().includes(archiveQuery.trim().toLowerCase())).length, 0)} of ${total} completed assignment${total !== 1 ? "s" : ""}`
    : `${total} completed assignment${total !== 1 ? "s" : ""}`
  }
</div>
```

---

## Verification checklist

1. `tsc --noEmit` — no errors
2. `npm run build` — clean
3. Manual:
   - [ ] Today tab in SideTabs shows total active count; updates when assignments are completed
   - [ ] Overdue section on Today page: High assignments appear above Medium above Low
   - [ ] Due Today section: same priority ordering
   - [ ] This Week and Coming Up: same priority ordering
   - [ ] Chapter page: "sort: date / priority" toggle works; priority mode floats High assignments up
   - [ ] Timeline bar appears on chapter cards that have a startDate and are not Done
   - [ ] Bar colour shifts from subject colour → amber → red as due date approaches
   - [ ] No timeline bar on Done assignments or assignments without a startDate
   - [ ] Archive filter narrows results in real time; × clears it; count updates
   - [ ] All existing animations still work
