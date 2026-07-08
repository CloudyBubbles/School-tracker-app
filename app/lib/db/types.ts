// Hand-written to match the live schema from session-29 — the Supabase MCP
// available in this environment is scoped to the Produlogic org account, not
// William's personal project, so `generate_typescript_types` can't reach it.
//
// `Relationships`/`Views`/`Functions` are required (not optional) by
// postgrest-js's GenericTable/GenericSchema — omitting them doesn't error,
// it just silently fails to satisfy the constraint and every query collapses
// to `never`. Keep them even though this schema has no views/functions.
export interface Database {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          colour: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          colour: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Insert"]>;
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          title: string;
          start_date: string | null;
          due_date: string;
          status: string;
          priority: string;
          notes: string;
          estimated_time: string | null;
          recurring: string | null;
          completed_at: string | null;
          sort_order: number | null;
          kind: string;
          credit_value: number | null;
          target_grade: string | null;
          standard_code: string | null;
          focus_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          title: string;
          start_date?: string | null;
          due_date: string;
          status?: string;
          priority?: string;
          notes?: string;
          estimated_time?: string | null;
          recurring?: string | null;
          completed_at?: string | null;
          sort_order?: number | null;
          kind?: string;
          credit_value?: number | null;
          target_grade?: string | null;
          standard_code?: string | null;
          focus_minutes?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "assignments_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      checkpoints: {
        Row: {
          id: string;
          assignment_id: string;
          label: string;
          done: boolean;
          sort_order: number | null;
        };
        Insert: {
          id?: string;
          // Kept required (no `?`) on purpose: checkpoints have no user_id of
          // their own, RLS proves ownership only through this column, so a
          // missing value should fail at compile time, not as an RLS reject.
          assignment_id: string;
          label: string;
          done?: boolean;
          sort_order?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["checkpoints"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "checkpoints_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
