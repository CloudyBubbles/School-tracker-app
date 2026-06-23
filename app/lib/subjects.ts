const SUBJECTS_KEY = "journal-subjects";

export interface Subject {
  id: string;
  name: string;
  colour: string;
}

const DEFAULT_SUBJECTS: Subject[] = [
  { id: "english", name: "English", colour: "#5b4a8f" },
  { id: "history", name: "History", colour: "#8b5e2a" },
  { id: "legal-studies", name: "Legal Studies", colour: "#2d6b4a" },
  { id: "art-history", name: "Art History", colour: "#7a3040" },
];

export function getSubjects(): Subject[] {
  if (typeof window === "undefined") return DEFAULT_SUBJECTS;
  const raw = localStorage.getItem(SUBJECTS_KEY);
  const saved: Subject[] | null = raw ? (JSON.parse(raw) as Subject[]) : null;
  const subjects: Subject[] = saved ?? DEFAULT_SUBJECTS;
  if (saved) {
    for (const def of DEFAULT_SUBJECTS) {
      if (!subjects.find((s) => s.id === def.id)) {
        subjects.push(def);
      }
    }
    saveSubjects(subjects);
  } else {
    saveSubjects(subjects);
  }
  return subjects;
}

export function saveSubjects(subjects: Subject[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
  }
}

export function getSubjectColour(name: string): string {
  const subjects = getSubjects();
  const match = subjects.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  return match?.colour ?? "#8a6040";
}
