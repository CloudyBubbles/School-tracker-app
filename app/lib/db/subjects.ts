import { supabase } from "@/app/lib/supabase";
import { currentUserId } from "./session";
import type { Subject } from "@/app/lib/subjects";

// Same four starter subjects the old localStorage layer self-healed with —
// only fires for a brand-new account with zero rows, which in practice means
// never, once the one-time migration has run.
const DEFAULT_SUBJECTS: Array<{ name: string; colour: string }> = [
  { name: "English", colour: "#5b4a8f" },
  { name: "History", colour: "#8b5e2a" },
  { name: "Legal Studies", colour: "#2d6b4a" },
  { name: "Art History", colour: "#7a3040" },
];

export async function listSubjects(): Promise<Subject[]> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, colour")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  if (data.length === 0) {
    const created: Subject[] = [];
    for (const def of DEFAULT_SUBJECTS) {
      created.push(await createSubject(def));
    }
    return created;
  }
  return data;
}

export async function createSubject(input: { name: string; colour: string }): Promise<Subject> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("subjects")
    .insert({ id: crypto.randomUUID(), user_id: userId, name: input.name, colour: input.colour })
    .select("id, name, colour")
    .single();
  if (error) throw error;
  return data;
}

// Caller must delete the subject's assignments first — assignments.subject_id
// has no ON DELETE CASCADE, so this alone will fail with an FK violation
// while any of that subject's assignments still exist.
export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}
