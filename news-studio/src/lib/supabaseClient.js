import { createClient } from '@supabase/supabase-js'

// Public Supabase project values (the anon key is meant to be public; RLS guards data).
// Override via env for other environments.
const SUPABASE_URL = import.meta.env.VITE_NEWS_STUDIO_SUPABASE_URL || 'https://ygxdrphajvrbjcaxhvcn.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_NEWS_STUDIO_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlneGRycGhhanZyYmpjYXhodmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDU0MjEsImV4cCI6MjA5NDkyMTQyMX0.odfY4E1DCxjb8kaXOkax4c_VI96QrzhoIW7cF6WMbes'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
