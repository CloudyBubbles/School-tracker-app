# Session 15 — Bug fixes + recurring assignments + cover urgency dots

## Context
- Next.js 16 App Router · TypeScript · Framer Motion · localStorage only
- Aesthetic: parchment `#f4ead5`, `--font-serif` / `--font-display` / `--font-hand`, `--ink-dark` / `--ink-medium` / `--ink-light`
- All styling is inline styles. No Tailwind utility classes. No `--text-*` CSS variables.
- Sessions 13 and 14 are complete. The codebase now includes: estimatedTime on Assignment, chapter pinned notes, global search, priority sorting, start→due timeline bar, archive search, SideTabs counts.

## Files to create
1. `app/lib/assignments.ts` (new)

## Files to edit
1. `app/types.ts`
2. `app/lib/storage.ts`
3. `app/journal/page.tsx` (Today page)
4. `app/journal/[subject]/page.tsx` (Chapter page)
5. `app/page.tsx` (Cover page)

---

## Task 1 — Bug fix: Today page search input dark mode

The search input in `app/journal/page.tsx` is missing the dark mode override properties that all other inputs in the app have. Find the search input (it has `placeholder="Search assignments..."`) and add:

```tsx
WebkitTextFillColor: "var(--ink-dark)",
colorScheme: "light" as const,
```

---

## Task 2 — Bug fix: Archive page SideTabs missing counts

In `app/journal/archive/page.tsx`, the SideTabs component is called without a `counts` prop, so all tab counts disappear when on the archive page.

Fix: load assignment counts and pass them. Add to the `loadData()` function:

```ts
const tabCountsMap: Record<string, number> = {};
for (const sub of subs) {
  tabCountsMap[sub.id] = all.filter(
    (a) => a.status !== "Done" && a.subject.toLowerCase() === sub.name.toLowerCase()
  ).length;
}
```

Add state: `const [tabCounts, setTabCounts] = useState<Record<string, number>>({});`

Call `setTabCounts(tabCountsMap)` at the end of `loadData()`.

Update the SideTabs call:
```tsx
<SideTabs
  subjects={subjects}
  activeSubjectId="__archive"
  onNavigate={handleTabNavigate}
  counts={tabCounts}
/>
```

---

## Task 3 — Bug fix: Pinned notes textarea dark mode

In `app/journal/[subject]/page.tsx`, the pinned notes `<textarea>` (the one with `placeholder="Scratch-pad for this subject..."`) is missing:

```tsx
WebkitTextFillColor: "var(--ink-dark)",
colorScheme: "light" as const,
```

Add these to the textarea's style object.

---

## Task 4 — Recurring assignments

Allow any assignment to be marked as recurring. When it is marked Done, the app automatically creates a new copy of the assignment with its due date shifted forward by the recurrence interval.

### 4a — Update types

In `app/types.ts`, add the `recurring` field to Assignment:

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
  estimatedTime?: string;
  recurring?: "weekly" | "fortnightly" | "monthly"; // ADD
}
```

### 4b — Update storage migration

In `app/lib/storage.ts`, update `loadAssignments` so old data without `recurring` doesn't cause issues. The current migration line already handles `priority`. No change needed — optional fields default to `undefined` when absent from JSON. Nothing to do here.

### 4c — Create `app/lib/assignments.ts`

This new file extracts status cycling into a shared utility so the recurring auto-create logic works from both Today and Chapter pages.

```ts
import { Assignment } from "@/app/types";
import { loadAssignments, saveAssignments } from "./storage";
import { parseLocalDate } from "./dates";

const STATUS_NEXT: Record<string, Assignment["status"]> = {
  "To do": "In progress",
  "In progress": "Done",
  "Done": "To do",
};

function shiftDateStr(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const RECUR_DAYS: Record<string, number> = {
  weekly: 7,
  fortnightly: 14,
  monthly: 28,
};

/**
 * Cycles an assignment's status and, if the new status is Done and the
 * assignment is recurring, appends a fresh copy with the due date shifted.
 * Saves to localStorage and returns the updated full array.
 */
export function cycleAssignmentStatus(id: string): Assignment[] {
  const all = loadAssignments();
  const target = all.find((a) => a.id === id);
  if (!target) return all;

  const nextStatus = STATUS_NEXT[target.status];
  const updated: Assignment[] = all.map((a) =>
    a.id === id ? { ...a, status: nextStatus } : a
  );

  // Auto-generate next recurrence when marked Done
  if (nextStatus === "Done" && target.recurring && RECUR_DAYS[target.recurring]) {
    const shift = RECUR_DAYS[target.recurring];
    const next: Assignment = {
      id: crypto.randomUUID(),
      subject: target.subject,
      title: target.title,
      dueDate: shiftDateStr(target.dueDate, shift),
      startDate: target.startDate ? shiftDateStr(target.startDate, shift) : undefined,
      status: "To do",
      priority: target.priority,
      notes: target.notes,
      estimatedTime: target.estimatedTime,
      checkpoints: target.checkpoints.map((cp) => ({ ...cp, done: false })),
      recurring: target.recurring,
    };
    updated.push(next);
  }

  saveAssignments(updated);
  return updated;
}
```

### 4d — Update Today page to use shared utility

In `app/journal/page.tsx`:

Add import: `import { cycleAssignmentStatus } from "@/app/lib/assignments";`

Replace `handleCycleStatus`:
```ts
const handleCycleStatus = (id: string) => {
  cycleAssignmentStatus(id);
  loadData();
};
```

Update all call sites — they currently pass `(a.id, a.status)`. Change them to just `(a.id)`. There are call sites in: the day-tap panel, the Due Today section, the Overdue section, the This Week section, and the Coming Up section. Update all of them.

### 4e — Update Chapter page to use shared utility

In `app/journal/[subject]/page.tsx`:

Add import: `import { cycleAssignmentStatus } from "@/app/lib/assignments";`

Replace `handleCycleStatus`:
```ts
const handleCycleStatus = (assignmentId: string) => {
  const updated = cycleAssignmentStatus(assignmentId);
  refreshAssignments(updated);
  recomputeTabCounts();
};
```

Update call sites — they currently pass `(a.id, a.status)`. Change all to `(a.id)`.

### 4f — Add recurring field to add/edit forms (Chapter page)

**In `FormState` interface and `EMPTY_FORM`:**
```ts
interface FormState {
  // ...existing...
  recurring?: Assignment["recurring"];
}

const EMPTY_FORM: FormState = {
  // ...existing...
  recurring: undefined,
};
```

**In the add-entry form**, add after the Notes textarea and before the Estimated time field:
```tsx
<div>
  <div style={labelStyle}>Repeat <span style={{ opacity: 0.5 }}>(optional)</span></div>
  <select
    value={form.recurring ?? ""}
    onChange={(e) => setForm({ ...form, recurring: (e.target.value as Assignment["recurring"]) || undefined })}
    style={{ ...inputStyle(false), appearance: "none" as const }}
  >
    <option value="">Does not repeat</option>
    <option value="weekly">Weekly</option>
    <option value="fortnightly">Fortnightly</option>
    <option value="monthly">Monthly</option>
  </select>
</div>
```

Do the same for the edit form using `editForm` / `setEditForm`.

**In `handleAddEntry`**, include the field:
```ts
const newA: Assignment = {
  // ...existing...
  recurring: form.recurring || undefined,
};
```

The edit save uses `{ ...a, ...editForm }` spread so it's covered automatically.

### 4g — Recurring badge on assignment cards

In the assignment card render (in `app/journal/[subject]/page.tsx`), after the estimated time badge in the badge row, add:

```tsx
{a.recurring && (
  <span
    style={{
      fontFamily: "var(--font-hand)",
      fontSize: "10px",
      color: "var(--ink-light)",
      opacity: 0.7,
    }}
    title={`Repeats ${a.recurring}`}
  >
    ↻ {a.recurring}
  </span>
)}
```

Also show it on the Today page assignment cards where appropriate — in the Due Today and Overdue card renders, add the same badge after the status button:

```tsx
{a.recurring && (
  <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", opacity: 0.6 }}>
    ↻
  </span>
)}
```

(Just the icon on Today page, no label — cards are more compact there.)

---

## Task 5 — Cover per-subject urgency dots

Add a small dot next to each chapter in the cover page's subject list. Red if the subject has overdue items, amber if only due-today items, nothing if all clear.

### 5a — Add state to Cover page

In `app/page.tsx`, add:
```ts
const [urgentSubjects, setUrgentSubjects] = useState<Record<string, "overdue" | "today">>({});
```

### 5b — Compute in useEffect

In the `useEffect` that loads data, after computing `overdue`/`done`/`dueToday`, add:

```ts
const urgentSubs: Record<string, "overdue" | "today"> = {};
for (const a of assignments) {
  if (a.status === "Done") continue;
  const due = parseLocalDate(a.dueDate);
  const subKey = a.subject.toLowerCase();
  if (due < today) {
    urgentSubs[subKey] = "overdue";
  } else if (due.getTime() === today.getTime()) {
    if (urgentSubs[subKey] !== "overdue") {
      urgentSubs[subKey] = "today";
    }
  }
}
setUrgentSubjects(urgentSubs);
```

Do the same in `handleImport` so it updates after restore.

### 5c — Dot in chapter list

In the chapter list render, inside each subject row, add a dot between the roman numeral and the subject name:

```tsx
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 0",
    borderBottom: "1px solid rgba(200,160,80,0.06)",
    cursor: "pointer",
    transition: "opacity 0.1s",
  }}
  ...
>
  <span style={{ /* roman numeral */ }}>
    {toRoman(i + 1)}
  </span>
  {/* Urgency dot */}
  {urgentSubjects[sub.name.toLowerCase()] && (
    <div
      style={{
        width: "5px",
        height: "5px",
        borderRadius: "50%",
        background: urgentSubjects[sub.name.toLowerCase()] === "overdue" ? "#e06060" : "#c8a050",
        flexShrink: 0,
        marginRight: "6px",
        opacity: 0.8,
      }}
    />
  )}
  <span style={{ /* subject name, flex: 1 */ }}>
    {sub.name}
  </span>
  <span style={{ /* count */ }}>
    {subjectCounts[sub.id] ?? 0}
  </span>
</div>
```

Place the dot div directly before the subject name span. The existing flex layout will keep it all aligned.

---

## Verification checklist

1. `tsc --noEmit` — no errors
2. `npm run build` — clean
3. Manual:
   - [ ] Search input text is visible on any background (dark mode fix)
   - [ ] SideTabs shows tab counts when navigating to Archive page
   - [ ] Pinned notes textarea text is visible
   - [ ] Add a recurring weekly assignment → mark it Done → a new copy appears immediately with dueDate +7 days
   - [ ] Mark a non-recurring assignment Done → no extra copy created
   - [ ] Recurring badge (↻) shows on chapter cards and Today cards
   - [ ] "Repeat" select appears in both the add-entry and edit forms
   - [ ] Cover page: overdue subjects show a red dot, due-today subjects show amber, clear subjects show nothing
   - [ ] Cover urgency dots update after backup/restore import
   - [ ] All existing status cycling still works from both Today page and Chapter page
