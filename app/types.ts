export interface Checkpoint {
  id: string;
  label: string;
  done: boolean;
}

export interface Assignment {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  status: "To do" | "In progress" | "Done";
  notes: string;
  checkpoints: Checkpoint[];
}
