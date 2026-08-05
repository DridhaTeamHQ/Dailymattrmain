import { createClient } from "@supabase/supabase-js";

/* Browser-side Supabase client. The publishable key is safe to ship — the
 * database is locked down with row level security, so the only thing this
 * key can do is INSERT a support request (see the migration under
 * supabase/migrations). */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — check your .env",
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
