import { createClient } from "@supabase/supabase-js";

/* Server-side client for the Pixie CMS database (a different Supabase
 * project from the support form's). pix_posts has no anon read policy, so
 * this uses the service-role key — which is why these variables are NOT
 * prefixed VITE_: Vite would otherwise inline them into the browser bundle.
 * This module must never be imported from anything under src/. */

export const hasServiceKey = () =>
  Boolean(process.env.PIX_SUPABASE_URL && process.env.PIX_SUPABASE_SERVICE_ROLE_KEY);

let client;

export function pixDb() {
  if (!hasServiceKey()) {
    throw new Error(
      "PIX_SUPABASE_URL / PIX_SUPABASE_SERVICE_ROLE_KEY are not set (Vercel project env, or .env.local for local dev)"
    );
  }
  return (client ??= createClient(process.env.PIX_SUPABASE_URL, process.env.PIX_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));
}
