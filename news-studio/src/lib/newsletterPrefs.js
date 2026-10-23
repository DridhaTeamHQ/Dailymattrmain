import { supabase } from './supabaseClient'

// Mon–Sat only (the agent runs Mon–Sat; Sunday is intentionally excluded).
export const WEEKDAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
]

function mapError(error) {
  if (error?.code === '23505') {
    if (String(error.message).includes('weekday')) {
      return new Error('That weekday is already used by another category. Pick another day.')
    }
    return new Error('You are already subscribed to this newsletter.')
  }
  return new Error(error?.message || 'Something went wrong.')
}

export async function getCategories() {
  const { data, error } = await supabase
    .from('newsletter_categories')
    .select('*')
    .order('sort_order')
  if (error) throw mapError(error)
  return data || []
}

// Returns { profile, subscriptions, blocked } where blocked maps weekday -> category_slug
// (only Category Small Articles reserve a weekday).
export async function getMyPreferences() {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return { profile: null, subscriptions: [], blocked: {} }

  const [{ data: profile }, { data: subs, error }] = await Promise.all([
    supabase.from('profiles').select('email, full_name').eq('id', user.id).maybeSingle(),
    supabase.from('newsletter_subscriptions').select('*').eq('user_id', user.id).eq('status', 'active'),
  ])
  if (error) throw mapError(error)

  const blocked = {}
  for (const s of subs || []) {
    if (s.weekday) blocked[s.weekday] = s.category_slug
  }
  return {
    profile: profile || { email: user.email, full_name: user.user_metadata?.full_name || '' },
    subscriptions: subs || [],
    blocked,
  }
}

// Make sure a profiles row exists for the signed-in user (covers pre-trigger accounts).
export async function ensureProfile() {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return
  await supabase
    .from('profiles')
    .upsert(
      { id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.user_metadata?.name || null },
      { onConflict: 'id', ignoreDuplicates: true }
    )
}

async function rowForCategory(userId, slug) {
  const { data } = await supabase
    .from('newsletter_subscriptions')
    .select('id, status')
    .eq('user_id', userId)
    .eq('category_slug', slug)
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] || null
}

// category = a newsletter_categories row. opts: { weekday, rhythm, send_days, source_preference }
// Every edition type supports rhythm 'daily' | 'weekly'; weekly editions carry
// a weekday (required for the topic categories, optional metadata otherwise).
export async function subscribe(category, opts = {}) {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) throw new Error('Please sign in to subscribe.')

  const rhythm = opts.rhythm || (category.newsletter_type === 'news_rhythm' ? 'daily' : 'weekly')
  if (category.newsletter_type === 'category_small_articles' && (rhythm === 'weekly' || rhythm === 'both') && !opts.weekday) {
    throw new Error('Choose a weekday for this category.')
  }

  const payload = {
    user_id: user.id,
    category_slug: category.slug,
    newsletter_type: category.newsletter_type,
    weekday: (rhythm === 'weekly' || rhythm === 'both') ? (opts.weekday || null) : null,
    rhythm,
    send_days: opts.send_days || null,
    source_preference: opts.source_preference || 'top',
    status: 'active',
    updated_at: new Date().toISOString(),
  }

  const existing = await rowForCategory(user.id, category.slug)
  const q = existing
    ? supabase.from('newsletter_subscriptions').update(payload).eq('id', existing.id)
    : supabase.from('newsletter_subscriptions').insert(payload)
  const { data, error } = await q.select().single()
  if (error) throw mapError(error)
  return data
}

export async function updateDay(category, weekday) {
  return subscribe(category, { weekday })
}

export async function unsubscribe(categorySlug) {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) throw new Error('Please sign in.')
  const { error } = await supabase
    .from('newsletter_subscriptions')
    .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('category_slug', categorySlug)
    .eq('status', 'active')
  if (error) throw mapError(error)
}

export async function unsubscribeAll() {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) throw new Error('Please sign in.')
  const { error } = await supabase
    .from('newsletter_subscriptions')
    .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'active')
  if (error) throw mapError(error)
}

export async function updateProfileName(fullName) {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) throw new Error('Please sign in.')
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) throw mapError(error)
}
