import { Assignment } from "@/app/types";

const STORAGE_KEY = "assignments";

export const loadAssignments = (): Assignment[] => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const saveAssignments = (assignments: Assignment[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  }
};
