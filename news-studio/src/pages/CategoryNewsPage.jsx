import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import LmNav from '../components/lm/LmNav'
import LmCategoryHero from '../components/lm/LmCategoryHero'
import LmCategoryBar from '../components/lm/LmCategoryBar'
import LmArticleFeed from '../components/lm/LmArticleFeed'
import LmNewsStudio from '../components/lm/LmNewsStudio'
import LmTopicRail, { TopicRailSkeleton } from '../components/lm/LmTopicRail'
import LmFaq from '../components/lm/LmFaq'
import LmFooter from '../components/lm/LmFooter'
import { lmCategoryBySlug } from '../components/lm/lmCategories'
import { fetchApprovedPage, fetchFeaturesByCategory, fetchTrendingTopics, freshTopics } from '../lib/content'
import { usePagedFeed } from '../lib/usePagedFeed'
import { useScrolledPast } from '../lib/useScrolledPast'
import NotFoundPage from './NotFoundPage'

// Category reading page — Figma "Home" frame 1:5336: dark hero + date-grouped
// article briefs. Handles the 5 agent topics (each mixing short briefs with
// its long-read case studies from editorial_drafts) plus the /general feed.
const AGENT_SLUGS = new Set(['real-estate', 'automobile', 'health-wellness', 'tech-ai', 'markets-startups'])

export default function CategoryNewsPage() {
  const { category: slug = 'general' } = useParams()
  const cat = lmCategoryBySlug(slug)

  // Filter pills. News Studio filters by SECTION (the scraper's feed topic —
  // National / International / Politics / …); category pages keep the
  // content-kind pills (All / Long reads / Briefs / Fact checked).
  const STUDIO_FILTERS = [
    ['all', 'All'],
    ['India', 'National'],
    ['World', 'International'],
    ['Politics', 'Politics'],
    ['Business', 'Business'],
    ['Sports', 'Sports'],
    ['Technology', 'Tech'],
    ['Science', 'Science'],
    ['Explained', 'Explained'],
  ]
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  useEffect(() => { setFilter('all'); setQuery('') }, [slug])
  // The search runs in the database, so wait for a typing pause.
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  // News Studio sections filter in the database; category-page pills (long /
  // short / fact) filter what's loaded.
  const topic = slug === 'general' && filter !== 'all' ? filter : null
  const fetchPage = (offset) => fetchApprovedPage({ slug, topic, query: search, offset })
  const { data: articles, loading, loadingMore, hasMore, loadMore } =
    usePagedFeed(fetchPage, [slug, topic, search], { intervalMs: 30000 })

  // Long-form features (the five agent topics) — about one a day, so they load
  // whole, once per category.
  const [features, setFeatures] = useState([])
  useEffect(() => {
    setFeatures([])
    if (!AGENT_SLUGS.has(slug)) return
    let alive = true
    fetchFeaturesByCategory(slug).catch(() => []).then((f) => { if (alive) setFeatures(f) })
    return () => { alive = false }
  }, [slug])

  const items = useMemo(() => {
    if (!articles) return null
    const q = search.toLowerCase()
    // Only features within the loaded window, so an old long read never sits
    // between today's briefs and the next page.
    const oldest = articles.length ? new Date(articles[articles.length - 1].publishedAt) : null
    const feats = features.filter((f) =>
      (!hasMore || !oldest || new Date(f.publishedAt) >= oldest) &&
      (!q || `${f.headline} ${f.summary || ''} ${f.source || ''}`.toLowerCase().includes(q)))
    const list = [...feats, ...articles]
    // Newest first; within the same day, long stories lead.
    const weight = (x) => (x.kind === 'feature' || x.kind === 'case_study' ? 1 : 0)
    list.sort((a, b) => {
      const dayA = new Date(a.publishedAt).toDateString()
      const dayB = new Date(b.publishedAt).toDateString()
      if (dayA === dayB) return weight(b) - weight(a) || (new Date(b.publishedAt) - new Date(a.publishedAt))
      return new Date(b.publishedAt) - new Date(a.publishedAt)
    })
    return list
  }, [articles, features, hasMore, search])

  // Trending topics — General feed only. Fetched on mount and whenever the slug
  // changes; fetchTrendingTopics swallows its own errors (returns []), so this
  // never breaks the page. Each topic card links to its own timeline page.
  const [topics, setTopics] = useState([])
  useEffect(() => {
    if (slug !== 'general') { setTopics([]); return }
    let alive = true
    fetchTrendingTopics().then((t) => { if (alive) setTopics(t) })
    return () => { alive = false }
  }, [slug])

  // A topic is trending only while it has a story on the feed's freshest day.
  // Compared against the UNFILTERED feed (remembered from the last load with no
  // section or search), so picking a section pill never changes which qualify.
  const [headItems, setHeadItems] = useState(null)
  useEffect(() => { setHeadItems(null) }, [slug])
  useEffect(() => {
    if (articles && !topic && !search) setHeadItems(articles)
  }, [articles, topic, search])
  const visibleTopics = useMemo(() => freshTopics(topics, headItems || []), [topics, headItems])

  const filtered = useMemo(() => {
    const list = items || []
    if (filter === 'all' || slug === 'general') return list
    if (filter === 'long') return list.filter((a) => a.kind === 'feature' || a.kind === 'case_study')
    if (filter === 'short') return list.filter((a) => a.kind === 'article')
    if (filter === 'fact') {
      return list
        .filter((a) => a.factScore != null)
        .slice()
        .sort((a, b) => b.factScore - a.factScore)
    }
    return list
  }, [items, filter, slug])
  const paging = { hasMore, loadingMore, onLoadMore: loadMore }

  // Once the reader scrolls in, the DailyMattr nav retracts and the section
  // toolbar takes the top slot — one bar of chrome instead of two.
  const navCollapsed = useScrolledPast(90)

  // Unknown category → 404 (the /:category route matches any single segment).
  if (!cat && slug !== 'general') return <NotFoundPage />

  const heroTitle = cat?.hero || cat?.title || (slug === 'general' ? 'News Studio' : slug)
  const tagline = cat?.desc || 'The stories worth knowing — curated, summarized, and grouped by day.'
  const heroImage = cat?.poster || cat?.image || '/news-studio/figma/hero-tech-ai-bg.png'

  return (
    <div className="min-h-screen bg-white font-bevietnam text-lm-800">
      <LmNav collapsed={navCollapsed} />
      {/* News Studio opens straight on the toolbar + stories (broadsheet front
          page, nothing to scroll past); category pages keep their big hero. */}
      {slug !== 'general' ? (
        <LmCategoryHero title={heroTitle} tagline={tagline} image={heroImage} slug={slug} />
      ) : (
        // Clear the fixed 70px nav — the hero used to carry this padding.
        <div className="h-[70px] bg-white" aria-hidden="true" />
      )}
      {/* Trending topics ride above the section toolbar: the rail is the front
          page's opening act, the filter bar sticks once you scroll past it. */}
      {slug === 'general' && (
        <div className="pb-[20px] pt-[10px] sm:pb-[28px] sm:pt-[12px]">
          {loading && visibleTopics.length === 0 ? (
            <TopicRailSkeleton />
          ) : visibleTopics.length > 0 ? (
            <LmTopicRail topics={visibleTopics} />
          ) : null}
        </div>
      )}
      <LmCategoryBar
        active={slug}
        filter={filter}
        onFilter={setFilter}
        filters={slug === 'general' ? STUDIO_FILTERS : undefined}
        title={slug === 'general' ? 'News Studio' : undefined}
        search={query}
        onSearch={setQuery}
        lifted={navCollapsed}
      />
      {slug === 'general' && <div className="h-[24px] sm:h-[32px]" aria-hidden="true" />}
      {/* General = the image-led News Studio front page; category pages keep
          the original date-grouped brief feed. */}
      {slug === 'general' ? (
        <LmNewsStudio
          items={filtered}
          loading={loading}
          {...paging}
          emptyLabel={
            query.trim()
              ? `No stories match “${query.trim()}”.`
              : filter === 'all'
                ? 'No stories here yet — check back soon.'
                : 'No stories in this section right now — check back soon.'
          }
        />
      ) : (
        <LmArticleFeed
          items={filtered}
          loading={loading}
          {...paging}
          emptyLabel={
            filter === 'long'
              ? 'No long reads here yet — switch to Briefs or check back soon.'
              : filter === 'short'
                ? 'No briefs here yet — switch to Long reads or check back soon.'
                : filter === 'fact'
                  ? 'No fact-scored stories here yet — new approvals are scored automatically.'
                  : 'No stories here yet — check back soon.'
          }
        />
      )}
      <LmFaq />
      <LmFooter />
    </div>
  )
}
