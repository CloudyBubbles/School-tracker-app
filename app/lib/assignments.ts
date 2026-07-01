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

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function cycleAssignmentStatus(id: string): Assignment[] {
  const all = loadAssignments();
  const target = all.find((a) => a.id === id);
  if (!target) return all;

  const nextStatus = STATUS_NEXT[target.status];
  const updated: Assignment[] = all.map((a) => {
    if (a.id !== id) return a;
    return nextStatus === "Done"
      ? { ...a, status: nextStatus, completedAt: todayStr() }
      : { ...a, status: nextStatus, completedAt: undefined };
  });

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
