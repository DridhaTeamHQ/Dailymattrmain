import { createClient } from "@supabase/supabase-js";

/* The one place that decides which Supabase project holds support_requests
 * and admin_settings, so /api/support writes where /api/admin reads. A URL is
 * only ever paired with its own project's service-role key:
 *   SUPPORT_SUPABASE_SERVICE_ROLE_KEY set -> SUPPORT_SUPABASE_URL (or VITE_SUPABASE_URL)
 *   otherwise                             -> the Pix project (PIX_SUPABASE_URL + its key)
 * Returns null when the chosen pair is incomplete. */
export function supportDb() {
  const [url, key] = process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY
    ? [process.env.SUPPORT_SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY]
    : [process.env.PIX_SUPABASE_URL, process.env.PIX_SUPABASE_SERVICE_ROLE_KEY];
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
