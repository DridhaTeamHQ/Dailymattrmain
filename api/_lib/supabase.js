import { createClient } from "@supabase/supabase-js";

/* Server-side client for the Pixie CMS database (a different Supabase
 * project from the support form's). pix_posts has no anon read policy, so
 * this uses the service-role key — which is why these variables are NOT
 * prefixed VITE_: Vite would otherwise inline them into the browser bundle.
 * This module must never be imported from anything under src/. */

export const hasServiceKey = () =>
  Boolean(process.env.PIX_SUPABASE_URL && process.env.PIX_SUPABASE_SERVICE_ROLE_KEY);

let client;

/* The function may run for 10 s (vercel.json maxDuration). A query that hangs
 * past this is abandoned so the page returns the branded 500 instead of the
 * platform's 504. */
const FETCH_TIMEOUT_MS = 7000;

/* abort() with no reason rejects with an AbortError, which postgrest-js gives
 * up on; AbortSignal.timeout()'s TimeoutError would be retried three more
 * times. The timer is left running (and unref'd) so a stalled body read is
 * cut off too — aborting a finished request does nothing. */
const timedFetch = (input, init = {}) => {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS).unref?.();
  if (init.signal) {
    if (init.signal.aborted) ctrl.abort();
    else init.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: ctrl.signal });
};

export function pixDb() {
  if (!hasServiceKey()) {
    throw new Error(
      "PIX_SUPABASE_URL / PIX_SUPABASE_SERVICE_ROLE_KEY are not set (Vercel project env, or .env.local for local dev)"
    );
  }
  return (client ??= createClient(process.env.PIX_SUPABASE_URL, process.env.PIX_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timedFetch },
  }));
}
