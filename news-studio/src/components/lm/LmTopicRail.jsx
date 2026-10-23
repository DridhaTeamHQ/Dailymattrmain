import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { topicPath } from '../../lib/routes'

// each card links to its topic's own page
const MotionLink = motion.create(Link)

// Trending-topic rail for the General feed — a horizontal strip of light white
// cards, each a cluster the agent has approved. Tapping a card opens the
// full-screen timeline (LmTopicTimeline). Cards enter with a keyed remount
// (initial -> animate) — deliberately no AnimatePresence exits, matching the
// rest of the app (see LmReader / LmBreakingCarousel).
const rb = { fontVariationSettings: '"wdth" 100' }

// The "Trending" mark — a thin red rule beside the word. Nothing more: the
// poster already carries a photo + headline, so the marker stays quiet and
// editorial (no pill, no animation).
function TrendingMark() {
  return (
    <span className="flex items-center gap-[8px]">
      <span className="h-[14px] w-[3px] rounded-full bg-[#FF3B30]" aria-hidden="true" />
      <span
        className="font-roboto text-[12px] font-bold tracking-[0.1em] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]"
        style={rb}
      >
        Trending
      </span>
    </span>
  )
}

function latestDate(topic) {
  // The topic's NEWEST story (computed in fetchTrendingTopics from member
  // timestamps) — never the approval date, which lags running stories by days.
  const iso = topic?.latestAt || topic?.approvedAt
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Full-bleed poster card: the topic's image fills the card, a dark gradient
// keeps the overlaid white text readable, and imageless topics fall back to a
// solid dark card with the same layout.
function TopicCard({ topic }) {
  const count = topic?.memberIds?.length || 0
  const when = latestDate(topic)
  // Corroboration lives in the tooltip rather than a badge — it varies per
  // topic, where a status chip read "Confirmed" on almost every card.
  const outlets = topic?.sourceCount || 0
  const hint = outlets ? `${topic.title} — ${count} stories across ${outlets} outlets` : topic.title
  return (
    <MotionLink
      key={topic.id}
      to={topicPath(topic)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex h-[240px] w-[258px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[18px] bg-[#141417] p-[16px] text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[3px] hover:shadow-[0px_16px_40px_rgba(0,0,0,0.22)] sm:h-[260px] sm:w-[296px]"
      title={hint}
    >
      {/* Full-bleed image + readability gradient (hides itself on a broken link) */}
      {topic.image && (
        <img
          src={topic.image}
          alt=""
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
        />
      )}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" aria-hidden="true" />

      <div className="relative z-[1] flex items-center justify-between">
        <TrendingMark />
        <span className="font-roboto text-[16px] leading-none text-white/70 transition-all duration-300 group-hover:translate-x-[3px] group-hover:text-white">↗</span>
      </div>

      <div className="relative z-[1] flex flex-col gap-[8px]">
        <h3 className="line-clamp-3 font-roboto text-[19px] font-bold leading-[1.26] text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.45)] sm:text-[21px]" style={rb}>
          {topic.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="font-roboto text-[11px] font-semibold uppercase tracking-[0.06em] text-white/75" style={rb}>
            {count} {count === 1 ? 'story' : 'stories'}{when ? ` · ${when}` : ''}
          </span>
          <span className="font-roboto text-[12px] font-semibold text-white/75 transition-colors duration-200 group-hover:text-white group-hover:underline" style={rb}>
            View&nbsp;timeline
          </span>
        </div>
      </div>
    </MotionLink>
  )
}

// Shimmer placeholder for Trending Topics rail matching the horizontal poster card layout
export function TopicRailSkeleton() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 sm:px-8" aria-hidden="true">
      <div className="mb-[14px] flex items-center gap-[16px]">
        <div className="skeleton-shimmer-dark h-[22px] sm:h-[28px] w-[170px] rounded-[6px]" />
        <div className="h-px flex-1 bg-lm-200" />
      </div>
      <div className="flex gap-[8px] overflow-hidden pb-[8px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="relative flex h-[240px] w-[258px] shrink-0 flex-col justify-between overflow-hidden rounded-[18px] bg-[#141417] p-[16px] sm:h-[260px] sm:w-[296px]"
          >
            <div className="skeleton-shimmer-dark absolute inset-0 opacity-20" />
            <div className="relative z-[1] flex items-center justify-between">
              <div className="flex items-center gap-[8px]">
                <span className="h-[14px] w-[3px] rounded-full bg-[#FF3B30]" />
                <span className="font-roboto text-[12px] font-bold tracking-[0.1em] text-white/50" style={rb}>Trending</span>
              </div>
              <span className="font-roboto text-[16px] text-white/40">↗</span>
            </div>
            <div className="relative z-[1] flex flex-col gap-[8px]">
              <div className="h-[20px] w-full rounded bg-white/20" />
              <div className="h-[20px] w-3/4 rounded bg-white/20" />
              <div className="mt-[4px] flex items-center justify-between">
                <div className="h-[12px] w-[90px] rounded bg-white/15" />
                <div className="h-[12px] w-[75px] rounded bg-white/15" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function LmTopicRail({ topics = [] }) {
  const scrollerRef = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  // Track scroll position so we can enable/disable the arrows and fade the edge
  // masks — the arrows only make sense while there's more to scroll to.
  const sync = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft >= max - 1)
  }, [])

  useEffect(() => {
    sync()
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      el.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [sync, topics.length])

  const nudge = (dir) => {
    const el = scrollerRef.current
    if (!el) return
    // Scroll by roughly one card-and-a-bit so a click always reveals fresh cards.
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 320), behavior: 'smooth' })
  }

  if (!topics.length) return null
  const hasOverflow = !atStart || !atEnd

  return (
    <section className="mx-auto max-w-[1440px] px-4 sm:px-8">
      <div className="mb-[14px] flex items-center gap-[16px]">
        <h2 className="whitespace-nowrap font-roboto text-[18px] font-bold leading-[32px] text-[#0F0F11] sm:text-[24px] sm:leading-[42px]" style={rb}>
          Trending topics
        </h2>
        <div className="h-px flex-1 bg-lm-400" />
        {/* Arrow controls — only shown when the rail actually overflows */}
        {hasOverflow && (
          <div className="hidden shrink-0 items-center gap-[8px] sm:flex">
            <button
              type="button"
              onClick={() => nudge(-1)}
              disabled={atStart}
              aria-label="Scroll trending topics left"
              className={`flex size-[38px] items-center justify-center rounded-full border transition-all duration-200 ${
                atStart
                  ? 'cursor-not-allowed border-lm-200 text-lm-300'
                  : 'border-lm-300 text-lm-800 hover:-translate-x-[1px] hover:border-lm-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.08)]'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              disabled={atEnd}
              aria-label="Scroll trending topics right"
              className={`flex size-[38px] items-center justify-center rounded-full border transition-all duration-200 ${
                atEnd
                  ? 'cursor-not-allowed border-lm-200 text-lm-300'
                  : 'border-lm-300 text-lm-800 hover:translate-x-[1px] hover:border-lm-800 hover:shadow-[0px_6px_16px_rgba(0,0,0,0.08)]'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
      </div>
      <div className="relative">
        {/* Edge fade masks hint at more content beyond the visible edge */}
        <div className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-[36px] bg-gradient-to-r from-lm-50 to-transparent transition-opacity duration-300 ${atStart ? 'opacity-0' : 'opacity-100'}`} aria-hidden="true" />
        <div className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-[36px] bg-gradient-to-l from-lm-50 to-transparent transition-opacity duration-300 ${atEnd ? 'opacity-0' : 'opacity-100'}`} aria-hidden="true" />
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-[8px] overflow-x-auto scroll-smooth pb-[8px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {topics.map((t) => (
            <TopicCard key={t.id} topic={t} />
          ))}
        </div>
      </div>
    </section>
  )
}
