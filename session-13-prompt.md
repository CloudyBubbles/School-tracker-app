# Session 13 — Bug fixes + week strip tap + cover banner + chapter notes + estimated time + global search

## Stack & constraints
- Next.js 16 App Router · TypeScript · Framer Motion · **localStorage only** (no server, no database)
- Journal aesthetic: parchment `#f4ead5`, fonts `--font-serif` / `--font-display` / `--font-hand`, colours `--ink-dark` / `--ink-medium` / `--ink-light` / `--gold`
- **Never use `--text-*` CSS variables** — all font sizes are fixed px values
- All styling uses inline styles, not Tailwind utility classes
- `perspective: "1200px"` lives on the layout.tsx wrapper; `transformStyle: "preserve-3d"` is on rotating divs only

## Files to edit
1. `app/types.ts`
2. `app/lib/storage.ts`
3. `app/components/journal/SideTabs.tsx`
4. `app/journal/page.tsx` (Today page)
5. `app/journal/[subject]/page.tsx` (Chapter page)
6. `app/page.tsx` (Cover page)

---

## Task 1 — Fix SideTabs `counts` prop (critical — Session 12 left this incomplete)

Both Today and Chapter pages already compute `tabCounts: Record<string, number>` and pass `counts={tabCounts}` to SideTabs, but SideTabs was never updated. Fix it now.

**In `app/components/journal/SideTabs.tsx`**, update the Props interface:

```ts
interface Props {
  subjects: Subject[];
  activeSubjectId: string | null;
  onNavigate: (path: string) => void;
  urgentIds?: string[];
  counts?: Record<string, number>; // ADD
}
```

Update the function signature:
```ts
export default function SideTabs({ subjects, activeSubjectId, onNavigate, urgentIds = [], counts = {} }: Props)
```

In the button render, after `{tab.label}` and the urgency dot, add a count badge for subject tabs only (not `__home` or `__archive`):

```tsx
{!tab.id.startsWith("__") && (counts[tab.id] ?? 0) > 0 && (
  <div
    style={{
      fontFamily: "var(--font-hand)",
      fontSize: "9px",
      color: tab.colour,
      opacity: 0.75,
      marginTop: "2px",
    }}
  >
    {counts[tab.id]}
  </div>
)}
```

---

## Task 2 — Fix `urgentIds` not recomputing after status change (Chapter page)

In `app/journal/[subject]/page.tsx`, update `refreshAssignments` to also recompute urgentIds and tabCounts:

```ts
const refreshAssignments = (all: Assignment[]) => {
  const subs = getSubjects();
  setAssignments(
    all
      .filter((a) => a.subject.toLowerCase() === (subject?.name ?? "").toLowerCase())
      .sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime())
  );
  // Recompute urgentIds
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const urgentSet = new Set<string>();
  for (const a of all) {
    if (a.status === "Done") continue;
    if (parseLocalDate(a.dueDate) <= today) {
      const subId = subs.find((s) => s.name.toLowerCase() === a.subject.toLowerCase())?.id;
      if (subId) urgentSet.add(subId);
    }
  }
  setUrgentIds([...urgentSet]);
};
```

---

## Task 3 — Week strip day tap (Today page)

When clicking a day cell in the week strip, expand a compact panel below the strip showing assignments due that day.

**Add state to Today page:**
```ts
const [selectedStripDay, setSelectedStripDay] = useState<number | null>(null);
const [allActive, setAllActive] = useState<Assignment[]>([]);
```

**In `loadData()`**, add after computing `strip`:
```ts
setAllActive(all.filter((a) => a.status !== "Done"));
```

Also reset selected day when data reloads (optional but clean):
```ts
// do NOT reset selectedStripDay — keep it so the panel stays open after quick-add
```

**Update the week strip day cells** — each cell div gets:
```tsx
onClick={() => setSelectedStripDay(selectedStripDay === i ? null : i)}
style={{
  // ...existing styles...
  cursor: "pointer",
  background: selectedStripDay === i
    ? "rgba(140,100,60,0.18)"
    : isToday ? "rgba(140,100,60,0.1)" : "transparent",
  border: selectedStripDay === i
    ? "1px solid rgba(140,100,60,0.35)"
    : isToday ? "1px solid rgba(140,100,60,0.2)" : "1px solid transparent",
}}
```

**Day tap panel** — render immediately after the week strip closing `</div>`, before the `{allEmpty ? ...}` block:

```tsx
{selectedStripDay !== null && (() => {
  const day = weekStrip[selectedStripDay];
  const dayAssignments = allActive.filter(
    (a) => parseLocalDate(a.dueDate).getTime() === day.date.getTime()
  );
  const dayLabel = selectedStripDay === 0
    ? "today"
    : day.date.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "short" });
  return (
    <div
      style={{
        borderLeft: "2px solid rgba(140,100,60,0.25)",
        padding: "10px 14px",
        marginBottom: "16px",
        background: "rgba(140,100,60,0.04)",
      }}
    >
      <div style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", marginBottom: "8px", letterSpacing: "0.06em" }}>
        {dayLabel}
      </div>
      {dayAssignments.length === 0 ? (
        <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "12px", color: "var(--ink-light)" }}>
          nothing due
        </div>
      ) : dayAssignments.map((a, i) => (
        <div
          key={a.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 0",
            borderBottom: i < dayAssignments.length - 1 ? "1px solid rgba(140,100,60,0.08)" : "none",
          }}
        >
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: getColour(a.subject), flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "13px", color: "var(--ink-dark)", lineHeight: 1.3 }}>{a.title}</div>
            <div style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: `${getColour(a.subject)}cc` }}>{a.subject}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleCycleStatus(a.id, a.status); }}
            style={{
              ...statusStyle(a.status),
              fontFamily: "var(--font-hand)",
              fontSize: "10px",
              padding: "1px 7px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {a.status}
          </button>
        </div>
      ))}
    </div>
  );
})()}
```

---

## Task 4 — Cover urgency banner (Cover page)

**Update stats state** in `app/page.tsx`:
```ts
const [stats, setStats] = useState({ total: 0, overdue: 0, done: 0, dueToday: 0 });
```

**In the useEffect**, add dueToday:
```ts
const dueToday = assignments.filter(
  (a) => a.status !== "Done" && parseLocalDate(a.dueDate).getTime() === today.getTime()
).length;
setStats({ total: assignments.length, overdue, done, dueToday });
```

**Banner** — render between the stats row `</div>` and the next divider `<div style={{ height: "1px"... }}`. Only show when there's something to report:

```tsx
{(stats.overdue > 0 || stats.dueToday > 0) && (
  <div
    style={{
      textAlign: "center",
      marginTop: "10px",
      fontFamily: "var(--font-hand)",
      fontSize: "10px",
      letterSpacing: "0.04em",
    }}
  >
    {stats.overdue > 0 && (
      <span style={{ color: "#e06060" }}>
        {stats.overdue} overdue
      </span>
    )}
    {stats.overdue > 0 && stats.dueToday > 0 && (
      <span style={{ color: "rgba(200,160,80,0.4)", margin: "0 6px" }}>·</span>
    )}
    {stats.dueToday > 0 && (
      <span style={{ color: "#c8a050" }}>
        {stats.dueToday} due today
      </span>
    )}
  </div>
)}
```

---

## Task 5 — Chapter pinned notes

A persistent scratch-pad text area at the top of each chapter, saved per-subject to localStorage.

**Add to `app/lib/storage.ts`:**
```ts
export function loadChapterNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("schoolwork-chapter-notes") ?? "{}");
  } catch {
    return {};
  }
}

export function saveChapterNote(subjectId: string, note: string): void {
  const all = loadChapterNotes();
  all[subjectId] = note;
  localStorage.setItem("schoolwork-chapter-notes", JSON.stringify(all));
}
```

**In `app/journal/[subject]/page.tsx`**:

Add import: `import { loadAssignments, saveAssignments, loadChapterNotes, saveChapterNote } from "@/app/lib/storage";`

Add state: `const [pinnedNote, setPinnedNote] = useState("");`

**In the useEffect**, after setting subject:
```ts
const notes = loadChapterNotes();
setPinnedNote(notes[subjectId] ?? "");
```

**Handler:**
```ts
const handleNoteChange = (value: string) => {
  setPinnedNote(value);
  saveChapterNote(subjectId, value);
};
```

**Render** — place after the progress bar block and BEFORE the show/hide done toggle:
```tsx
<textarea
  value={pinnedNote}
  onChange={(e) => handleNoteChange(e.target.value)}
  placeholder="Notes for this chapter..."
  rows={1}
  style={{
    width: "100%",
    fontFamily: "var(--font-hand)",
    fontSize: "13px",
    color: "var(--ink-medium)",
    background: "transparent",
    border: "none",
    borderBottom: pinnedNote ? "1px solid rgba(140,100,60,0.15)" : "1px solid transparent",
    resize: "vertical",
    outline: "none",
    padding: "4px 0 8px",
    marginBottom: "12px",
    lineHeight: 1.6,
    boxSizing: "border-box" as const,
    WebkitTextFillColor: "var(--ink-medium)",
    colorScheme: "light" as const,
  }}
  onFocus={(e) => { e.target.style.borderBottomColor = "rgba(140,100,60,0.3)"; }}
  onBlur={(e) => { e.target.style.borderBottomColor = pinnedNote ? "rgba(140,100,60,0.15)" : "transparent"; }}
/>
```

---

## Task 6 — Estimated time field

**In `app/types.ts`**, add optional field:
```ts
export interface Assignment {
  id: string;
  subject: string;
  title: string;
  startDate?: string;
  dueDate: string;
  status: "To do" | "In progress" | "Done";
  priority: "Low" | "Medium" | "High";
  notes: string;
  checkpoints: Checkpoint[];
  estimatedTime?: string; // ADD — e.g. "2 hrs", "45 min"
}
```

**In `app/journal/[subject]/page.tsx`**:

Update `FormState`:
```ts
interface FormState {
  title: string;
  startDate?: string;
  dueDate: string;
  status: Assignment["status"];
  priority: Assignment["priority"];
  notes: string;
  estimatedTime?: string; // ADD
}

const EMPTY_FORM: FormState = {
  title: "",
  startDate: "",
  dueDate: "",
  status: "To do",
  priority: "Medium",
  notes: "",
  estimatedTime: "", // ADD
};
```

**In both the add-entry form and the edit form**, add after the Notes textarea field:
```tsx
<div>
  <div style={labelStyle}>
    Estimated time <span style={{ opacity: 0.5 }}>(optional)</span>
  </div>
  <input
    type="text"
    value={form.estimatedTime ?? ""}
    onChange={(e) => setForm({ ...form, estimatedTime: e.target.value })}
    placeholder="e.g. 2 hrs, 45 min"
    style={inputStyle(false)}
  />
</div>
```

For the edit form use `editForm` / `setEditForm` instead of `form` / `setForm`.

**In `handleAddEntry`**, include the field:
```ts
const newA: Assignment = {
  // ...existing fields...
  estimatedTime: form.estimatedTime?.trim() || undefined,
};
```

The edit save (`handleSaveEdit`) already uses spread `{ ...a, ...editForm }` so estimatedTime is covered automatically.

**Badge display** — in the badge row (after the status cycle button), add:
```tsx
{a.estimatedTime && (
  <span
    style={{
      fontFamily: "var(--font-hand)",
      fontSize: "10px",
      color: "var(--ink-light)",
      opacity: 0.8,
    }}
  >
    ~ {a.estimatedTime}
  </span>
)}
```

---

## Task 7 — Global search on Today page

**Add state:**
```ts
const [searchQuery, setSearchQuery] = useState("");
```

**Note:** `allActive` state was added in Task 3. Ensure it exists before implementing search.

**Restructure the top of the content area** — replace the existing `{!showQuickAdd ? <button>...</button> : <div>form</div>}` ternary with this layout:

```tsx
{/* Search + Add row — always visible */}
<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
  <div style={{ position: "relative", flex: 1 }}>
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="search assignments..."
      style={{
        width: "100%",
        padding: "5px 28px 5px 8px",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize: "12px",
        background: "transparent",
        border: "1px solid rgba(140,100,60,0.2)",
        borderRadius: "3px",
        color: "var(--ink-dark)",
        outline: "none",
        boxSizing: "border-box" as const,
        WebkitTextFillColor: "var(--ink-dark)",
        colorScheme: "light" as const,
      }}
      onFocus={(e) => { e.target.style.borderColor = "rgba(140,100,60,0.4)"; }}
      onBlur={(e) => { e.target.style.borderColor = "rgba(140,100,60,0.2)"; }}
    />
    {searchQuery && (
      <button
        onClick={() => setSearchQuery("")}
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
  {!showQuickAdd && (
    <button
      onClick={() => setShowQuickAdd(true)}
      style={{
        background: "transparent",
        border: "none",
        fontFamily: "var(--font-hand)",
        fontSize: "12px",
        color: "var(--ink-light)",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      + add entry
    </button>
  )}
</div>

{/* Quick-add form — below the row when open */}
{showQuickAdd && (
  <div
    style={{
      borderLeft: "3px solid rgba(140,100,60,0.3)",
      padding: "12px 14px",
      background: "rgba(140,100,60,0.03)",
      marginBottom: "16px",
    }}
    onKeyDown={(e) => {
      if (e.key === "Escape") {
        setShowQuickAdd(false);
        setQuickForm({ subjectId: "", title: "", dueDate: "" });
      }
    }}
  >
    {/* ...existing quick-add form contents unchanged... */}
  </div>
)}
```

**Search results** — wrap the entire `{allEmpty ? (...) : (...)}` block in a search check. Replace it with:

```tsx
{searchQuery.trim() ? (
  // Search results view
  <div>
    <div
      style={{
        fontFamily: "var(--font-hand)",
        fontSize: "10px",
        color: "var(--ink-light)",
        letterSpacing: "0.08em",
        textAlign: "center",
        margin: "16px 0 10px",
      }}
    >
      — search results —
    </div>
    {(() => {
      const q = searchQuery.trim().toLowerCase();
      const results = allActive.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q)
      );
      if (results.length === 0) {
        return (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "13px",
              color: "var(--ink-light)",
              textAlign: "center",
              marginTop: "32px",
            }}
          >
            nothing found
          </p>
        );
      }
      return results.map((a) => (
        <Link
          key={a.id}
          href={`/journal/${subjectIdMap[a.subject.toLowerCase()] ?? "unknown"}`}
          style={{ textDecoration: "none", display: "block" }}
          onClick={() => startTransition()}
        >
          <div
            style={{
              borderLeft: `3px solid ${getColour(a.subject)}`,
              padding: "8px 14px",
              marginBottom: "6px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "9px",
                color: `${getColour(a.subject)}cc`,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              {a.subject}
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "14px", color: "var(--ink-dark)" }}>
              {a.title}
            </div>
            <div
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "11px",
                color: urgencyColour(a.dueDate),
                marginTop: "2px",
              }}
            >
              {formatDate(a.dueDate)}
            </div>
          </div>
        </Link>
      ));
    })()}
  </div>
) : (
  // Normal view — existing allEmpty / sections code (no changes)
  allEmpty ? (
    /* ...existing empty state... */
  ) : (
    /* ...existing overdue / due today / this week / coming up sections... */
  )
)}
```

---

## Verification checklist

Run after all tasks are complete:

1. `tsc --noEmit` — no TypeScript errors
2. `npm run build` — clean build
3. Manual:
   - [ ] Subject tabs on SideTabs show assignment count badges
   - [ ] Marking overdue item Done on chapter page removes urgency dot immediately (no reload)
   - [ ] Clicking a week strip day expands the panel; clicking again collapses it
   - [ ] Status cycle works inside the day tap panel
   - [ ] Cover shows red/amber banner when overdue or today count > 0; hides when both are 0
   - [ ] Chapter notes persist when navigating away and back, and survive page reload
   - [ ] Estimated time field appears in add + edit forms, shows as `~ X` badge on card
   - [ ] Search bar filters across all subjects by title and subject name
   - [ ] Search × button clears and returns to normal view
   - [ ] All existing animations (page turn, tab slide) still work
