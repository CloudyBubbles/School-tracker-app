import { supabase } from "./supabase";

// Sign-in only — no sign-up flow. The one account for this app is created
// by hand via the Supabase dashboard, not through app UI.
export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error?.message ?? null;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
