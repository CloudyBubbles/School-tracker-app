export interface Checkpoint {
  id: string;
  label: string;
  done: boolean;
}

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
}
