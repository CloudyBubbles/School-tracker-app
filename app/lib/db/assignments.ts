import { supabase } from "@/app/lib/supabase";
import { currentUserId } from "./session";
import { parseLocalDate } from "@/app/lib/dates";
import type { Assignment, Checkpoint } from "@/app/types";
import type { Database } from "./types";

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];
type CheckpointRow = Database["public"]["Tables"]["checkpoints"]["Row"];

function toAssignment(row: AssignmentRow, checkpoints: CheckpointRow[]): Assignment {
  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    startDate: row.start_date ?? undefined,
    dueDate: row.due_date,
    status: row.status as Assignment["status"],
    priority: row.priority as Assignment["priority"],
    notes: row.notes,
    checkpoints: checkpoints
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((c) => ({ id: c.id, label: c.label, done: c.done })),
    estimatedTime: row.estimated_time ?? undefined,
    recurring: (row.recurring as Assignment["recurring"]) ?? undefined,
    completedAt: row.completed_at ?? undefined,
    order: row.sort_order ?? undefined,
    kind: (row.kind as Assignment["kind"]) ?? undefined,
    creditValue: row.credit_value ?? undefined,
    targetGrade: (row.target_grade as Assignment["targetGrade"]) ?? undefined,
    standardCode: row.standard_code ?? undefined,
    focusMinutes: row.focus_minutes,
  };
}

export async function listAssignments(): Promise<Assignment[]> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("assignments")
    .select("*, checkpoints(*)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data as unknown as (AssignmentRow & { checkpoints: CheckpointRow[] })[]).map((row) =>
    toAssignment(row, row.checkpoints ?? [])
  );
}

export async function createAssignment(
  input: Omit<Assignment, "id"> & { checkpoints?: Checkpoint[] }
): Promise<void> {
  const userId = await currentUserId();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("assignments").insert({
    id,
    user_id: userId,
    subject_id: input.subjectId,
    title: input.title,
    start_date: input.startDate ?? null,
    due_date: input.dueDate,
    status: input.status,
    priority: input.priority,
    notes: input.notes,
    estimated_time: input.estimatedTime ?? null,
    recurring: input.recurring ?? null,
    completed_at: input.completedAt ?? null,
    sort_order: input.order ?? null,
    kind: input.kind ?? "task",
    credit_value: input.creditValue ?? null,
    target_grade: input.targetGrade ?? null,
    standard_code: input.standardCode ?? null,
    focus_minutes: input.focusMinutes ?? 0,
  });
  if (error) throw error;

  const checkpoints = input.checkpoints ?? [];
  if (checkpoints.length > 0) {
    const { error: cpError } = await supabase.from("checkpoints").insert(
      checkpoints.map((cp, i) => ({
        id: cp.id,
        assignment_id: id,
        label: cp.label,
        done: cp.done,
        sort_order: i,
      }))
    );
    if (cpError) throw cpError;
  }
}

// `"field" in patch` (not `patch.field !== undefined`) on purpose — lets
// callers distinguish "omit = leave column alone" from "include as undefined
// = clear this column to null" (cycleAssignmentStatus needs the latter for
// completedAt when cycling away from Done).
export async function updateAssignment(
  id: string,
  patch: Partial<Omit<Assignment, "id">>
): Promise<void> {
  const dbPatch: Database["public"]["Tables"]["assignments"]["Update"] = {};
  if ("subjectId" in patch) dbPatch.subject_id = patch.subjectId;
  if ("title" in patch) dbPatch.title = patch.title;
  if ("startDate" in patch) dbPatch.start_date = patch.startDate ?? null;
  if ("dueDate" in patch) dbPatch.due_date = patch.dueDate;
  if ("status" in patch) dbPatch.status = patch.status;
  if ("priority" in patch) dbPatch.priority = patch.priority;
  if ("notes" in patch) dbPatch.notes = patch.notes;
  if ("estimatedTime" in patch) dbPatch.estimated_time = patch.estimatedTime ?? null;
  if ("recurring" in patch) dbPatch.recurring = patch.recurring ?? null;
  if ("completedAt" in patch) dbPatch.completed_at = patch.completedAt ?? null;
  if ("order" in patch) dbPatch.sort_order = patch.order ?? null;
  if ("kind" in patch) dbPatch.kind = patch.kind;
  if ("creditValue" in patch) dbPatch.credit_value = patch.creditValue ?? null;
  if ("targetGrade" in patch) dbPatch.target_grade = patch.targetGrade ?? null;
  if ("standardCode" in patch) dbPatch.standard_code = patch.standardCode ?? null;
  if ("focusMinutes" in patch) dbPatch.focus_minutes = patch.focusMinutes;

  if (Object.keys(dbPatch).length > 0) {
    const { error } = await supabase.from("assignments").update(dbPatch).eq("id", id);
    if (error) throw error;
  }

  if (patch.checkpoints !== undefined) {
    await replaceCheckpoints(id, patch.checkpoints);
  }
}

async function replaceCheckpoints(assignmentId: string, checkpoints: Checkpoint[]): Promise<void> {
  const { error: delError } = await supabase.from("checkpoints").delete().eq("assignment_id", assignmentId);
  if (delError) throw delError;
  if (checkpoints.length === 0) return;
  const { error: insError } = await supabase.from("checkpoints").insert(
    checkpoints.map((cp, i) => ({
      id: cp.id,
      assignment_id: assignmentId,
      label: cp.label,
      done: cp.done,
      sort_order: i,
    }))
  );
  if (insError) throw insError;
}

export async function toggleCheckpoint(checkpointId: string, done: boolean): Promise<void> {
  const { error } = await supabase.from("checkpoints").update({ done }).eq("id", checkpointId);
  if (error) throw error;
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw error;
}

// Returns the number deleted — the cover page's remove-subject confirm
// warning shows this count before the user commits to the delete.
export async function deleteAssignmentsBySubject(subjectId: string): Promise<number> {
  const { data, error } = await supabase
    .from("assignments")
    .delete()
    .eq("subject_id", subjectId)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function updateSortOrder(updates: { id: string; order: number }[]): Promise<void> {
  const results = await Promise.all(
    updates.map((u) => supabase.from("assignments").update({ sort_order: u.order }).eq("id", u.id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function clearSortOrder(subjectId: string): Promise<void> {
  const { error } = await supabase.from("assignments").update({ sort_order: null }).eq("subject_id", subjectId);
  if (error) throw error;
}

const STATUS_NEXT: Record<Assignment["status"], Assignment["status"]> = {
  "To do": "In progress",
  "In progress": "Done",
  "Done": "To do",
};

const RECUR_DAYS: Record<string, number> = { weekly: 7, fortnightly: 14 };

// Monthly uses a real calendar month (setMonth) so it doesn't drift ~2-3 days
// earlier every cycle the way a fixed 28-day offset would.
function shiftDateByRecurrence(dateStr: string, recurring: string): string {
  const d = parseLocalDate(dateStr);
  if (recurring === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setDate(d.getDate() + (RECUR_DAYS[recurring] ?? 0));
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Takes the full Assignment (not just an id) so the caller's already-loaded
// object supplies subjectId for the regenerated recurring occurrence —
// no extra read-before-write needed to carry it forward correctly.
export async function cycleAssignmentStatus(current: Assignment): Promise<void> {
  const nextStatus = STATUS_NEXT[current.status];
  await updateAssignment(current.id, {
    status: nextStatus,
    completedAt: nextStatus === "Done" ? todayStr() : undefined,
  });

  if (nextStatus === "Done" && current.recurring) {
    await createAssignment({
      subjectId: current.subjectId,
      title: current.title,
      dueDate: shiftDateByRecurrence(current.dueDate, current.recurring),
      startDate: current.startDate ? shiftDateByRecurrence(current.startDate, current.recurring) : undefined,
      status: "To do",
      priority: current.priority,
      notes: current.notes,
      estimatedTime: current.estimatedTime,
      checkpoints: current.checkpoints.map((cp) => ({ id: crypto.randomUUID(), label: cp.label, done: false })),
      recurring: current.recurring,
      kind: current.kind,
      creditValue: current.creditValue,
      targetGrade: current.targetGrade,
      standardCode: current.standardCode,
    });
  }
}

// Cannot take a "current value" shortcut like cycleAssignmentStatus — the
// caller (PomodoroTimer, via pomodoro-context's linkedTask) only carries
// { id, title }, not the full row. Small race window if two tabs were
// mid-session simultaneously; accepted as negligible for solo use.
export async function logFocusMinutes(assignmentId: string, minutes: number): Promise<void> {
  if (minutes <= 0) return;
  const { data, error } = await supabase
    .from("assignments")
    .select("focus_minutes")
    .eq("id", assignmentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return; // deleted since the focus session started — quiet no-op, same as before
  const { error: updError } = await supabase
    .from("assignments")
    .update({ focus_minutes: data.focus_minutes + minutes })
    .eq("id", assignmentId);
  if (updError) throw updError;
}
