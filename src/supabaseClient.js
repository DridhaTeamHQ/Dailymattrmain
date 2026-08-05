import { createClient } from "@supabase/supabase-js";

/* Browser-side Supabase client. The publishable key is safe to ship — the
 * database is locked down with row level security, so the only thing this
 * key can do is INSERT a support request (see the migration under
 * supabase/migrations). */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let client;

/* Built on first use, not at import time. Throwing while the module loads
 * would abort the whole of support.js before it wires up any listeners,
 * leaving the topic dropdown dead — a missing env var should cost you the
 * submit, not the entire form. */
export function getSupabase() {
  if (!url || !key) {
    throw new Error(
      "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — set them in .env locally and in the Vercel project settings",
    );
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
