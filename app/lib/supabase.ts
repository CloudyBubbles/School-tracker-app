import { createClient } from "@supabase/supabase-js";
import type { Database } from "./db/types";

// Publishable/anon key — safe to expose in browser code, RLS is what actually
// enforces "only your own rows," not secrecy of this key. Never put the
// service_role key here or in any client-facing file.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars — check .env.local");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
