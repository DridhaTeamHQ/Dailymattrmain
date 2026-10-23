// Live content layer — reads completed content straight from the email agent's
// safe public feed, so every successfully summarized article appears on the
// site without waiting for email approval. Editor changes still win through
// edited_title / edited_summary when present.
//
// The agent funnels everything into one table:
//   • Topic short articles -> category in Real Estate / Automobile /
//                             Health & Wellness / Tech & AI / Markets & Startups
//                             (kind: 'article')
//   • General news         -> category null, topic in India/World/Business/...
// Long reads per topic come from editorial_drafts (kind: 'feature').
// We read status in ('summarized','approved','sent'); pending/rejected never show.

import { supabase } from './supabaseClient'
import { decodeEntities, stripArtifacts } from './text'

// The five topic categories map 1:1 to their own pages. Everything else
// (general news tagged India/World/Business/Explained/…) falls into the
// single "General" feed.
const TOPIC_SLUG = {
  'Real Estate': 'real-estate',
  'Automobile': 'automobile',
  'Health & Wellness': 'health-wellness',
  'Tech & AI': 'tech-ai',
  'Markets & Startups': 'markets-startups',
}
function slugFor(category) {
  return TOPIC_SLUG[category] || 'general'
}

// Drop the synthetic fragment the agent appends to make synced rows unique
// (e.g. "…/article#shortly-corporate-case-<uuid>").
const cleanUrl = (u) => (u ? u.split('#shortly')[0] || u : '')

// The newsroom runs on IST — every "which day is this story from" question on
// the site (feed date headers, trending freshness) keys off this one helper so
// they can never disagree. Returns a stable per-day key ('16/7/2026'); it is an
// identity key, NOT sortable (en-IN renders dd/mm/yyyy) — order by timestamp.
export const IST = 'Asia/Kolkata'
export const istDayKey = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { timeZone: IST }) : '')

// Reader-facing label for the scraper's internal feed topic. "India" reads as
// "National" on the site; unknown topics fall back to their own name. Category
// pages already name their bucket, so the tag applies to General articles only.
const TOPIC_LABEL = {
  India: 'National',
  Politics: 'Politics',
  World: 'World',
  Business: 'Business',
  Explained: 'Explained',
  Sports: 'Sports',
  Science: 'Science',
  Technology: 'Tech',
}
export function topicLabel(item) {
  if (item?.category) return null
  const t = item?.topic
  return t ? TOPIC_LABEL[t] || t : null
}

function normalize(row) {
  const bucket = row.category || row.topic || ''
  return {
    id: row.id,
    kind: 'article',
    headline: decodeEntities(row.edited_title || row.title),
    summary: stripArtifacts(decodeEntities(row.edited_summary || row.summary || '')),
    body: stripArtifacts(decodeEntities(row.edited_summary || row.summary || '')),
    source: decodeEntities(row.source || ''),
    sourceUrl: cleanUrl(row.url),
    publishedAt: row.reviewed_at || row.scraped_at || row.created_at,
    category: row.category || null,
    topic: row.topic || null,
    bucket,                                   // raw agent label, used as a chip
    slug: slugFor(row.category),
    edited: !!(row.edited_title || row.edited_summary),
    // Editor prominence, 1-5 where 5 = breaking (was wrongly read as 1 = lead).
    prominence: row.prominence ?? null,
    importance: row.prominence != null && row.prominence >= 4 ? row.prominence : null,
    // AI fact check (see email agent docs/FACT_CHECKING.md): 0-100 score,
    // band label, and the per-claim audit trail rendered in the reader.
    factScore: row.fact_score ?? null,
    factLabel: row.fact_label || null,
    factNotes: row.fact_notes || null,
    // Alternate reader versions generated at approval:
    // { eli5, tldr[], deep_dive, key_numbers[] }
    versions: row.versions || null,
    // Lead image scraped from the source feed / og:image (General only; often null).
    image: row.image_url || null,
    // URLs of the OTHER outlets' copies of this same story, found semantically
    // (title embeddings) by the fact-check corroborator. Powers the front page's
    // same-story dedupe: if A lists B's url, they are one story.
    relatedUrls: (row.fact_notes?.sources || []).map((s) => cleanUrl(s?.url)).filter(Boolean),
  }
}

// Light list payload — NO raw_content (the full scraped article text). Pulling
// it for every approved row on every poll is large enough to hit the anon role's
// statement timeout and fail the whole fetch; the list/reading views don't use
// it (case-study bodies come from corporate_cases). Keeping this lean makes the
// pull fast and reliable.
const SELECT_BASE =
  'id,title,edited_title,summary,edited_summary,source,url,topic,category,section,prominence,status,reviewed_at,scraped_at,created_at'
// Fact check + alternate versions arrived later; fall back to the base list if
// the DB migration hasn't been applied yet so the feed never breaks on deploy order.
const SELECT = `${SELECT_BASE},fact_score,fact_label,fact_notes,versions,image_url`
const PUBLIC_ARTICLES_RELATION = 'public_articles_feed'
const PUBLIC_STATUSES = ['summarized', 'approved', 'sent']

const missingColumn = (error) => error && /column|does not exist/i.test(error.message || '')

// Every completed item, newest first. Fall back to the base table during a
// staggered deploy; its RLS will continue exposing only the previously public
// rows until the safe feed view migration lands.
export async function fetchApproved() {
  const query = (relation, cols) => supabase
    .from(relation)
    .select(cols)
    .in('status', PUBLIC_STATUSES)
    .order('scraped_at', { ascending: false })
  let { data, error } = await query(PUBLIC_ARTICLES_RELATION, SELECT)
  if (error && /relation|schema cache|could not find/i.test(error.message || '')) {
    ({ data, error } = await query('articles', SELECT))
  }
  if (missingColumn(error)) ({ data, error } = await query(PUBLIC_ARTICLES_RELATION, SELECT_BASE))
  if (error) throw error
  return (data || []).map(normalize)
}

// Approved items mapped to a single website category slug.
export async function fetchApprovedByCategory(slug) {
  const all = await fetchApproved()
  return all.filter((a) => a.slug === slug)
}

// Specific completed articles by id — used by the trending-topic timeline,
// whose members can be older than the fetchApproved window. Same light SELECT
// (with the missingColumn fallback) and the same normalize() as the main feed.
export async function fetchArticlesByIds(ids) {
  if (!ids || !ids.length) return []
  const query = (relation, cols) => supabase
    .from(relation)
    .select(cols)
    .in('id', ids)
    .in('status', PUBLIC_STATUSES)
  let { data, error } = await query(PUBLIC_ARTICLES_RELATION, SELECT)
  if (error && /relation|schema cache|could not find/i.test(error.message || '')) {
    ({ data, error } = await query('articles', SELECT))
  }
  if (missingColumn(error)) ({ data, error } = await query(PUBLIC_ARTICLES_RELATION, SELECT_BASE))
  if (error) throw error
  return (data || []).map(normalize)
}

// Trending topics — clusters the agent has approved. RLS already restricts the
// `topics` table (and its joined topic_articles) to status='approved', so we
// just read and shape. Never selects heavy columns (no centroid/embeddings).
// Topics with fewer than 3 members are dropped as too thin to be a timeline.
// Media OWNERSHIP groups — TOI + ET are both the Times Group, HT + Mint share
// HT Media, every NDTV feed is NDTV. Counting distinct GROUPS (not feed names)
// stops one media house's syndicated copies from posing as independent
// multi-outlet coverage in the trend ranking and the confirmation status.
function mediaGroupOf(source) {
  const s = String(source || '').toLowerCase()
  if (s.includes('times of india') || s.includes('economic times') || s.startsWith('toi')) return 'times-group'
  if (s.includes('hindustan times') || s.startsWith('ht ') || s === 'mint' || s.includes('livemint')) return 'ht-media'
  if (s.includes('ndtv')) return 'ndtv'
  if (s.includes('indian express') || s.startsWith('ie ')) return 'indian-express'
  if (s.includes('the hindu')) return 'the-hindu'
  if (s.includes('bbc')) return 'bbc'
  return s || 'unknown'
}

export async function fetchTrendingTopics() {
  try {
    const { data, error } = await supabase
      .from('topics')
      .select('id,title,slug,description,score,approved_at,created_at,topic_articles(article_id,position,added_at,articles(source,image_url,reviewed_at,scraped_at))')
    if (error) throw error
    return (data || [])
      .map((t) => {
        const members = [...(t.topic_articles || [])].sort((a, b) => {
          const pa = a.position ?? null
          const pb = b.position ?? null
          if (pa != null && pb != null) return pa - pb
          if (pa != null) return -1
          if (pb != null) return 1
          return new Date(a.added_at || 0) - new Date(b.added_at || 0)
        })
        // Distinct outlets across the (RLS-visible, approved) members. Drives
        // ordering: a story several sources are covering ranks ahead of a
        // single-outlet cluster.
        const sourceSet = new Set(
          members.map((m) => (m.articles?.source || '').trim().toLowerCase()).filter(Boolean),
        )
        // The topic's NEWEST story (same publishedAt recipe as normalize()) —
        // what the card date shows, and what the freshness rule keys off.
        const memberTimes = members.map((m) => new Date(m.articles?.reviewed_at || m.articles?.scraped_at || 0).getTime())
        const latestMs = Math.max(0, ...memberTimes)
        const latestAt = latestMs > 0 ? new Date(latestMs).toISOString() : t.approved_at
        // TREND SCORE, computed live at view time (the DB score goes stale — it
        // was set when the cluster formed). Velocity = every story decayed by an
        // 18h half-life-ish exponential, so a topic gathering coverage RIGHT NOW
        // outruns a big-but-cooling one; breadth = distinct outlets, worth 2
        // stories each. Rail order = this, descending.
        const now = Date.now()
        const velocity = memberTimes.reduce((sum, ms) => {
          if (!ms) return sum
          const ageHours = Math.max(0, (now - ms) / 3_600_000)
          return sum + Math.exp(-ageHours / 18)
        }, 0)
        // Breadth counts independent media GROUPS (ownership-aware), and a
        // single-source cluster is penalised — one outlet pushing a story hard
        // should not outrank two houses covering it moderately.
        const groupSet = new Set(
          members.map((m) => (m.articles?.source || '').trim()).filter(Boolean).map(mediaGroupOf),
        )
        const singleSourcePenalty = sourceSet.size <= 1 ? 0.6 : 1
        const trendScore = (velocity + groupSet.size * 2) * singleSourcePenalty
        return {
          id: t.id,
          title: decodeEntities(t.title || ''),
          slug: t.slug,
          description: decodeEntities(t.description || ''),
          score: t.score ?? null,
          approvedAt: t.approved_at,
          latestAt,
          latestDayKey: istDayKey(latestAt),
          sourceCount: sourceSet.size,
          trendScore,
          // First member that carries a scraped image — the rail card's visual.
          image: members.map((m) => m.articles?.image_url).find(Boolean) || null,
          memberIds: members.map((m) => m.article_id),
        }
      })
      .filter((t) => t.memberIds.length >= 3)
      // MOST trending first: live velocity + outlet breadth (see trendScore
      // above). Freshest story breaks exact ties.
      .sort((a, b) => {
        if (b.trendScore !== a.trendScore) return b.trendScore - a.trendScore
        return new Date(b.latestAt || 0) - new Date(a.latestAt || 0)
      })
  } catch {
    return []
  }
}

// A topic is only TRENDING while it is still getting coverage. Keep topics
// whose newest story falls on the freshest IST day present in `items` (the
// live feed) — NOT wall-clock "today", which would empty the rail every
// morning until the ~08:40 IST cron lands the day's stories. When the feed
// hasn't loaded yet, pass everything through rather than blanking the rail.
export function freshTopics(topics, items) {
  if (!topics?.length) return []
  if (!items?.length) return topics
  // Max by timestamp, then derive the day key — the en-IN key (dd/mm/yyyy) is
  // an identity, not a sortable string.
  const latestMs = Math.max(...items.map((a) => new Date(a.publishedAt || 0).getTime()))
  if (!Number.isFinite(latestMs) || latestMs <= 0) return topics
  const latestFeedDay = istDayKey(new Date(latestMs).toISOString())
  return topics.filter((t) => t.latestDayKey === latestFeedDay)
}

// Long-form topic FEATURES (the daily case study per topic) — the long
// counterpart to the short briefs in `articles`. Read from editorial_drafts.
// topic_slug already matches our website slugs (real-estate / automobile /
// health-wellness / tech-ai / markets-startups).
export async function fetchFeatures() {
  const FEATURE_BASE = 'id,topic_slug,topic_name,headline,summary,detail,primary_source_url,primary_source_title,generated_at,status'
  const query = (cols) => supabase
    .from('editorial_drafts')
    .select(cols)
    .in('status', ['approved', 'published'])
    .order('generated_at', { ascending: false })
  let { data, error } = await query(`${FEATURE_BASE},fact_score,fact_label,fact_notes,versions`)
  if (missingColumn(error)) ({ data, error } = await query(FEATURE_BASE))
  if (error) throw error
  return (data || []).map((d) => ({
    id: `feature-${d.id}`,         // prefixed so it never collides with a brief id
    kind: 'feature',
    slug: d.topic_slug,
    headline: decodeEntities(d.headline),
    summary: decodeEntities(d.summary || ''),
    body: decodeEntities(d.detail || d.summary || ''),
    source: decodeEntities(d.primary_source_title || ''),
    sourceUrl: d.primary_source_url || '',
    publishedAt: d.generated_at,
    bucket: d.topic_name,
    factScore: d.fact_score ?? null,
    factLabel: d.fact_label || null,
    factNotes: d.fact_notes || null,
    versions: d.versions || null,
  }))
}

export async function fetchFeaturesByCategory(slug) {
  const all = await fetchFeatures()
  return all.filter((f) => f.slug === slug)
}

// Breaking score — MIRRORS the SQL single source of truth
// (supabase/migrations breaking_score fn in the agent repo):
// prominence x cross-outlet velocity x fact trust, decayed with ~5.5h half-life.
export function breakingScore(item) {
  const prominence = item.prominence ?? 2
  const sources = Number(item?.factNotes?.source_count ?? 1)
  const fact = item.factScore ?? 60
  const ageHours = Math.max((Date.now() - new Date(item.publishedAt).getTime()) / 3_600_000, 0)
  const raw = (prominence / 5) * 45 + (Math.min(Math.max(sources - 1, 0), 3) / 3) * 30 + (fact / 100) * 25
  return raw * Math.exp(-ageHours / 8)
}

// True for stories worth the BREAKING banner: editor-rated high, corroborated
// by 2+ outlets (or rated 5), fresh, and not in the unverified band.
export function isBreaking(item) {
  const prominence = item.prominence ?? 0
  const sources = Number(item?.factNotes?.source_count ?? 1)
  const ageHours = (Date.now() - new Date(item.publishedAt).getTime()) / 3_600_000
  const factOk = item.factScore == null || item.factScore >= 40
  return prominence >= 4 && (sources >= 2 || prominence === 5) && ageHours < 24 && factOk
}

// Pretty label for a category slug (for chips/sections on the home page).
export const SLUG_LABEL = {
  general: 'News Studio',
  'real-estate': 'Real Estate',
  'automobile': 'Automobile',
  'health-wellness': 'Health & Wellness',
  'tech-ai': 'Tech & AI',
  'markets-startups': 'Markets & Startups',
}
