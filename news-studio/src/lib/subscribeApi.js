// Posts the newsletter subscribe form to the Supabase `subscribers` edge function.
//
// Config via Vite env (all public values — the anon key is meant to be public):
//   VITE_NEWS_STUDIO_SUBSCRIBE_URL      e.g. https://<ref>.functions.supabase.co/subscribers
//   VITE_NEWS_STUDIO_SUPABASE_ANON_KEY  the project's anon (publishable) key
// Sensible defaults are baked in so the form works out of the box.

const SUBSCRIBE_URL =
  import.meta.env.VITE_NEWS_STUDIO_SUBSCRIBE_URL ||
  'https://ygxdrphajvrbjcaxhvcn.functions.supabase.co/subscribers'

const ANON_KEY =
  import.meta.env.VITE_NEWS_STUDIO_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlneGRycGhhanZyYmpjYXhodmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDU0MjEsImV4cCI6MjA5NDkyMTQyMX0.odfY4E1DCxjb8kaXOkax4c_VI96QrzhoIW7cF6WMbes'

/**
 * @param {{ name?: string, email: string, rhythm: string,
 *           send_days?: string[], categories: string[], source_preference: string }} payload
 */
export async function subscribeNewsletter(payload) {
  const res = await fetch(SUBSCRIBE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action: 'subscribe', ...payload }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || `Subscription failed (${res.status})`)
  }
  return data // { ok, created? , existing?, resubscribed? }
}
