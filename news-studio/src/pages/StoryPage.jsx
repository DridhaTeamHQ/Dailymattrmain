import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import LmNav from '../components/lm/LmNav'
import LmReader from '../components/lm/LmReader'
import LmFooter from '../components/lm/LmFooter'
import { dedupeStories } from '../components/lm/LmNewsStudio'
import { fetchApproved, fetchArticlesByIds, fetchTrendingTopics } from '../lib/content'
import { parseSlugId, storyPath } from '../lib/routes'
import { applyHead, storySeo, FEED_SEO } from '../lib/seo'
import NotFoundPage from './NotFoundPage'

const newestFirst = (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)

// The stories a reader steps through around this one: the topic's timeline
// when the story was opened from it (?topic=<id>), otherwise the News Studio
// feed in front-page order.
async function loadSequence(topicId) {
  if (topicId) {
    const topic = (await fetchTrendingTopics()).find((t) => String(t.id) === topicId)
    if (topic) return (await fetchArticlesByIds(topic.memberIds)).sort(newestFirst)
  }
  const all = await fetchApproved()
  return dedupeStories(all.filter((a) => a.slug === 'general').sort(newestFirst))
}

// /<headline-slug>-<id> — one page per story, same URL shape as /news.
export default function StoryPage() {
  const id = parseSlugId(useParams().story)?.id || ''
  const [params] = useSearchParams()
  const topicId = params.get('topic')
  const navigate = useNavigate()
  const location = useLocation()
  // { topicId, forId, list } once loaded. Stepping between stories of the same
  // sequence reuses it; only a new topic or an unknown id loads again.
  const [loaded, setLoaded] = useState(null)
  const items = loaded?.list || null
  const index = useMemo(() => (items || []).findIndex((x) => String(x.id) === id), [items, id])

  useEffect(() => {
    if (!id || (loaded && loaded.topicId === topicId && index >= 0)) return
    let alive = true
    loadSequence(topicId)
      .then(async (list) => {
        // Older stories (outside the live feed window) still get a page.
        if (!list.some((x) => String(x.id) === id)) {
          const [own] = await fetchArticlesByIds([id]).catch(() => [])
          if (own) list = [own, ...list]
        }
        if (alive) setLoaded({ topicId, forId: id, list })
      })
      .catch(() => { if (alive) setLoaded({ topicId, forId: id, list: [] }) })
    return () => { alive = false }
  }, [topicId, id]) // eslint-disable-line react-hooks/exhaustive-deps

  const item = index >= 0 ? items[index] : null
  useEffect(() => {
    if (item) applyHead(storySeo(item))
    return () => applyHead(FEED_SEO)
  }, [item])

  const pathFor = (story) => storyPath(story, { topic: topicId })
  // Back returns to wherever the reader came from inside News Studio; a story
  // opened straight from a shared link goes to the feed (or its topic).
  const back = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(topicId ? `/topic/${encodeURIComponent(topicId)}` : '/')
  }

  // a path with no story id (an old category link) goes to the feed
  if (!id) return <Navigate to="/" replace />
  // loaded for this id and still not there: unknown or not public
  if (loaded && loaded.topicId === topicId && loaded.forId === id && index < 0) return <NotFoundPage />

  return (
    <div className="min-h-screen bg-white font-bevietnam text-lm-800">
      <LmNav />
      {item ? (
        <LmReader
          items={items}
          index={index}
          onIndex={(next) => navigate(pathFor(items[next]))}
          onClose={back}
          pathFor={pathFor}
        />
      ) : (
        <StorySkeleton />
      )}
      <LmFooter />
    </div>
  )
}

function StorySkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pb-[80px] pt-[120px] sm:px-8 lg:px-12" aria-hidden="true">
      <div className="flex max-w-[860px] flex-col gap-[14px]">
        <div className="skeleton-shimmer h-[14px] w-[120px] rounded-[4px]" />
        <div className="skeleton-shimmer h-[40px] w-full rounded-[8px]" />
        <div className="skeleton-shimmer h-[40px] w-3/4 rounded-[8px]" />
        <div className="skeleton-shimmer h-[14px] w-[260px] rounded-[4px]" />
        <div className="skeleton-shimmer mt-[16px] aspect-video w-full rounded-[16px]" />
      </div>
    </div>
  )
}
