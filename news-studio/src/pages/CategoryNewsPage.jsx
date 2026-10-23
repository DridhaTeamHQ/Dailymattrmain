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
import { fetchApproved, fetchFeaturesByCategory, fetchTrendingTopics, freshTopics } from '../lib/content'
import { useLiveData } from '../lib/useLiveData'
import { useScrolledPast } from '../lib/useScrolledPast'
import NotFoundPage from './NotFoundPage'

// Category reading page — Figma "Home" frame 1:5336: dark hero + date-grouped
// article briefs. Handles the 5 agent topics (each mixing short briefs with
// its long-read case studies from editorial_drafts) plus the /general feed.
const AGENT_SLUGS = new Set(['real-estate', 'automobile', 'health-wellness', 'tech-ai', 'markets-startups'])

export default function CategoryNewsPage() {
  const { category: slug = 'general' } = useParams()
  const cat = lmCategoryBySlug(slug)

  const fetcher = useMemo(() => {
    return async () => {
      const [articles, features] = await Promise.all([
        fetchApproved(),
        AGENT_SLUGS.has(slug) ? fetchFeaturesByCategory(slug).catch(() => []) : Promise.resolve([]),
      ])
      const feed = cat?.feed || {}
      const matches = (a) => {
        if (feed.general && a.slug === 'general') return true
        if (feed.category && a.slug === slug) return true
        if (feed.topics && a.slug === 'general' && feed.topics.includes(a.topic)) return true
        return false
      }
      const list = [...features, ...articles.filter(matches)]
      // Newest first; within the same day, long stories lead.
      const weight = (x) => (x.kind === 'feature' || x.kind === 'case_study' ? 1 : 0)
      list.sort((a, b) => {
        const dayA = new Date(a.publishedAt).toDateString()
        const dayB = new Date(b.publishedAt).toDateString()
        if (dayA === dayB) return weight(b) - weight(a) || (new Date(b.publishedAt) - new Date(a.publishedAt))
        return new Date(b.publishedAt) - new Date(a.publishedAt)
      })
      return list
    }
  }, [slug, cat])

  const { data: items, loading } = useLiveData(fetcher, [slug], { intervalMs: 30000 })

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
  // Compared against the UNFILTERED feed, so picking a section pill (Sports…)
  // never changes which topics qualify.
  const visibleTopics = useMemo(() => freshTopics(topics, items || []), [topics, items])

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
  const filtered = useMemo(() => {
    let list = items || []
    // Live search from the toolbar — matches headline, brief, and outlet name;
    // composes with the section/kind pills below.
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((a) =>
        `${a.headline} ${a.summary || ''} ${a.source || ''}`.toLowerCase().includes(q),
      )
    }
    if (filter === 'all') return list
    if (slug === 'general') return list.filter((a) => a.topic === filter)
    if (filter === 'long') return list.filter((a) => a.kind === 'feature' || a.kind === 'case_study')
    if (filter === 'short') return list.filter((a) => a.kind === 'article')
    if (filter === 'fact') {
      return list
        .filter((a) => a.factScore != null)
        .slice()
        .sort((a, b) => b.factScore - a.factScore)
    }
    return list
  }, [items, filter, slug, query])

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
