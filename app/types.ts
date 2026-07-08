export interface Checkpoint {
  id: string;
  label: string;
  done: boolean;
}

export interface Assignment {
  id: string;
  subjectId: string;
  title: string;
  startDate?: string;
  dueDate: string;
  status: "To do" | "In progress" | "Done";
  priority: "Low" | "Medium" | "High";
  notes: string;
  checkpoints: Checkpoint[];
  estimatedTime?: string;
  recurring?: "weekly" | "fortnightly" | "monthly";
  completedAt?: string;
  order?: number;
  // Absent/undefined reads as "task" everywhere — no migration step for
  // assignments already in localStorage, so this must stay the rule at every
  // read site, not just at creation.
  kind?: "task" | "assessment";
  creditValue?: number;
  targetGrade?: "Achieved" | "Merit" | "Excellence";
  standardCode?: string;
  // Minutes of Pomodoro focus time logged against this specific occurrence.
  // Absent/undefined reads as 0 — not carried over to regenerated recurring
  // occurrences (each occurrence's focus time is its own).
  focusMinutes?: number;
}
