import { Assignment } from "@/app/types";

const STORAGE_KEY = "assignments";

export const loadAssignments = (): Assignment[] => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  let parsed: Assignment[];
  try {
    parsed = JSON.parse(saved) as Assignment[];
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((a) => ({
    ...a,
    priority: (a.priority ?? "Medium") as Assignment["priority"],
    checkpoints: a.checkpoints ?? [],
  }));
};

export const saveAssignments = (assignments: Assignment[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  }
};

export function loadChapterNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("schoolwork-chapter-notes") ?? "{}"); }
  catch { return {}; }
}

export function saveChapterNote(subjectId: string, note: string): void {
  const all = loadChapterNotes();
  all[subjectId] = note;
  localStorage.setItem("schoolwork-chapter-notes", JSON.stringify(all));
}
