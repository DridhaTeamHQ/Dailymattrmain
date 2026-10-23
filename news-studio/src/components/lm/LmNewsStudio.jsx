import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { storyPath } from '../../lib/routes'
import { FactChip } from './LmFactBadge'
import { breakingScore, isBreaking, topicLabel, FEED_PAGE_SIZE } from '../../lib/content'
import {
  FeedTail,
  dayKey,
  headerLabel,
  Excerpt,
  availableLenses,
  LensPills,
  ContentSwap,
} from './LmArticleFeed'

// News Studio — the image-led front page for /general, styled after a classic
// broadsheet news front (BBC reference): serif headlines that underline on
// hover, FLAT borderless cards separated by hairline rules and column gutters,
// uppercase section kickers under a full-width rule, and "2 hrs ago | Topic"
// meta lines. Cards without an image degrade to text; broken hotlinks hide
// themselves (onError). Category pages keep the original LmArticleFeed.
const rb = { fontVariationSettings: '"wdth" 100' }
const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }

const hideOnError = (e) => { e.currentTarget.style.display = 'none' }

// ---- Same-story dedupe ----
// Different outlets file the same story under DIFFERENT headlines ("Cabinet
// approves Rs 25,000 cr Ganga, Varuna corridors" vs "Varanasi to get two
// elevated highway corridors…"), so headline comparison alone can't catch them.
// The pipeline already links these semantically: the fact-check corroborator
// matches title embeddings and records each sibling's URL in
// fact_notes.sources[] (surfaced as item.relatedUrls). Two stories where either
// lists the other's URL ARE the same story. Headline-token overlap stays only
// as a fallback for near-identical twins ("US" vs "U.S.") on rows whose source
// list is missing. The better-corroborated copy survives (more sources, then
// higher fact score); comparison is against already-kept stories only — no
// transitive chain-merging of loosely related coverage.
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'with', 'from', 'as', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 'his', 'her', 'their', 'any', 'after', 'over', 'into', 'says', 'said', 'new'])
function titleTokens(headline) {
  const out = new Set()
  for (const t of String(headline || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)) {
    if (t && (t.length >= 3 || /\d/.test(t)) && !STOP.has(t)) out.add(t)
  }
  return out
}
function similarTitles(aTokens, bTokens) {
  if (aTokens.size === 0 || bTokens.size === 0) return false
  let inter = 0
  for (const t of aTokens) if (bTokens.has(t)) inter++
  const jaccard = inter / (aTokens.size + bTokens.size - inter)
  return jaccard >= 0.5 || inter >= 7
}
function sameStory(a, b) {
  if (a.url && b.item.relatedUrls?.includes(a.url)) return true
  if (b.url && a.item.relatedUrls?.includes(b.url)) return true
  return similarTitles(a.tokens, b.tokens)
}
function corroboration(it) {
  return (it.factNotes?.source_count ?? 1) * 1000 + (it.factScore ?? 0)
}
export function dedupeStories(items) {
  // Prefer the better-corroborated duplicate, but keep the FEED's order.
  const ranked = [...items].sort((a, b) => corroboration(b) - corroboration(a))
  const kept = new Set()
  const picked = []
  for (const it of ranked) {
    const entry = { item: it, url: it.sourceUrl || '', tokens: titleTokens(it.headline) }
    if (picked.some((p) => sameStory(entry, p))) continue
    picked.push(entry)
    kept.add(it.id)
  }
  return items.filter((it) => kept.has(it.id))
}

// "30 mins ago" / "5 hrs ago" / "2 days ago" — BBC-style relative timestamp.
function timeAgo(iso) {
  if (!iso) return ''
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// Meta line: "2 hrs ago | National" + the fact chip as the only colour accent.
function Meta({ item }) {
  const label = topicLabel(item)
  return (
    <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px]">
      <span className="font-roboto text-[12px] text-lm-500" style={rb}>
        {timeAgo(item.publishedAt)}
        {label && <span className="px-[8px] text-lm-300">|</span>}
        {label && <span className="font-medium text-lm-600">{label}</span>}
      </span>
      <FactChip item={item} small />
    </div>
  )
}

// Broadcast lower-third ticker — a thin dark strip hugging the glass toolbar.
// The day's hottest headlines scroll continuously (CSS marquee: the row is
// rendered twice and translated -50%, so the loop is seamless); hover pauses,
// clicking a headline opens that story's page.
function LmBreakingTicker({ items = [] }) {
  if (!items.length) return null
  const row = (keyPrefix) => (
    <div className="flex shrink-0 items-center">
      {items.map((it) => (
        <Link
          key={`${keyPrefix}-${it.id}`}
          to={storyPath(it)}
          className="flex shrink-0 items-center gap-[10px] px-[22px] font-roboto text-[13px] font-medium text-white/90 transition-colors hover:text-white hover:underline"
          style={rb}
        >
          <span className="size-[4px] shrink-0 rounded-full bg-[#E33B3B]" aria-hidden="true" />
          <span className="whitespace-nowrap">{it.headline}</span>
        </Link>
      ))}
    </div>
  )
  return (
    <div className="relative flex h-[38px] items-stretch overflow-hidden bg-[#0F0F11]">
      <style>{'@keyframes lm-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}'}</style>
      {/* Fixed BREAKING tab on the left */}
      <span className="z-[1] flex shrink-0 items-center gap-[7px] bg-[#E33B3B] px-[14px] font-roboto text-[11px] font-bold uppercase tracking-[0.09em] text-white" style={rb}>
        <motion.span
          className="size-[6px] rounded-full bg-white"
          animate={{ opacity: [1, 0.15, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        Breaking
      </span>
      {/* Marquee: pause on hover via CSS */}
      <div className="group flex flex-1 items-center overflow-hidden">
        <div
          className="flex w-max items-center group-hover:[animation-play-state:paused]"
          style={{ animation: `lm-ticker ${Math.max(24, items.length * 9)}s linear infinite` }}
        >
          {row('a')}
          {row('b')}
        </div>
      </div>
      {/* Right edge fade so headlines slide out cleanly */}
      <span className="pointer-events-none absolute inset-y-0 right-0 w-[48px] bg-gradient-to-l from-[#0F0F11] to-transparent" aria-hidden="true" />
    </div>
  )
}

// Shimmer placeholder matching the exact News Studio broadsheet front page
// (Breaking ticker + Top stories 3-column band + Section Fronts & Masonry cards).
function StudioSkeleton() {
  const block = 'skeleton-shimmer rounded-[4px]'
  const blockDark = 'skeleton-shimmer-dark rounded-[4px]'
  return (
    <>
      {/* Broadcast ticker skeleton */}
      <div className="relative flex h-[38px] items-stretch overflow-hidden bg-[#0F0F11]" aria-hidden="true">
        <span className="z-[1] flex shrink-0 items-center gap-[7px] bg-[#E33B3B] px-[14px] font-roboto text-[11px] font-bold uppercase tracking-[0.09em] text-white" style={rb}>
          <span className="size-[6px] rounded-full bg-white opacity-60" />
          Breaking
        </span>
        <div className="flex flex-1 items-center gap-[24px] px-[22px]">
          <div className="h-[12px] w-[240px] rounded bg-white/20" />
          <div className="hidden h-[12px] w-[200px] rounded bg-white/15 md:block" />
          <div className="hidden h-[12px] w-[220px] rounded bg-white/10 xl:block" />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[44px] px-4 py-[32px] sm:px-8 sm:py-[48px] lg:px-[32px]" aria-hidden="true">
        {/* ---- Top-stories band skeleton ---- */}
        <section>
          <div className="mb-[20px] border-t border-lm-800 pt-[10px]">
            <div className={`h-[13px] w-[110px] ${blockDark}`} />
          </div>
          <div className="grid gap-[28px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)_minmax(0,1fr)]">
            {/* Center Lead Story: Order 1 on mobile, Order 2 on desktop, flanked by hairlines */}
            <div className="order-1 flex flex-col gap-[14px] lg:order-2 lg:border-x lg:border-lm-200 lg:px-[28px]">
              <div className={`aspect-video w-full ${block}`} />
              <div className="flex flex-col gap-[8px]">
                <div className={`h-[28px] sm:h-[34px] w-11/12 ${blockDark}`} />
                <div className={`h-[28px] sm:h-[34px] w-4/5 ${blockDark}`} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <div className={`h-[15px] w-full ${block}`} />
                <div className={`h-[15px] w-11/12 ${block}`} />
                <div className={`h-[15px] w-3/4 ${block}`} />
              </div>
              <div className="flex items-center gap-[10px]">
                <div className={`h-[13px] w-[130px] ${block}`} />
                <div className={`h-[18px] w-[60px] rounded-full ${block}`} />
              </div>
            </div>

            {/* Left Column: Order 2 on mobile, Order 1 on desktop (prominent top + thumbnail bottom) */}
            <div className="order-2 flex flex-col gap-[20px] divide-y divide-lm-200 lg:order-1 [&>*+*]:pt-[20px]">
              {/* Prominent side story */}
              <div className="flex flex-col gap-[10px]">
                <div className={`aspect-video w-full ${block}`} />
                <div className="flex flex-col gap-[6px]">
                  <div className={`h-[20px] sm:h-[24px] w-full ${blockDark}`} />
                  <div className={`h-[20px] sm:h-[24px] w-4/5 ${blockDark}`} />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <div className={`h-[13px] w-full ${block}`} />
                  <div className={`h-[13px] w-2/3 ${block}`} />
                </div>
                <div className={`h-[12px] w-[110px] ${block}`} />
              </div>
              {/* Compact thumbnail row */}
              <div className="flex gap-[12px]">
                <div className={`h-[76px] w-[114px] shrink-0 ${block}`} />
                <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                  <div className={`h-[17px] w-full ${blockDark}`} />
                  <div className={`h-[17px] w-3/4 ${blockDark}`} />
                  <div className={`mt-[4px] h-[12px] w-[90px] ${block}`} />
                </div>
              </div>
            </div>

            {/* Right Column (Headline Rail): Order 3 */}
            <div className="order-3 flex flex-col divide-y divide-lm-200">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col gap-[6px] py-[16px] first:pt-0 last:pb-0">
                  <div className={`h-[17px] w-full ${blockDark}`} />
                  <div className={`h-[17px] w-4/5 ${blockDark}`} />
                  <div className={`h-[13px] w-11/12 ${block}`} />
                  <div className={`mt-[2px] h-[12px] w-[100px] ${block}`} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Section Fronts & Masonry skeleton below the band ---- */}
        <section>
          <div className="mb-[20px] border-t border-lm-800 pt-[10px]">
            <div className={`h-[13px] w-[180px] ${blockDark}`} />
          </div>

          <div className="mb-[36px]">
            <div className="mb-[16px] flex items-center gap-[12px]">
              <div className="skeleton-shimmer h-[13px] w-[90px] rounded-[3px]" />
              <div className="h-px flex-1 bg-lm-200" />
            </div>
            <div className="grid gap-[20px] sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-[10px] border-b border-lm-200 pb-[16px]">
                  <div className={`aspect-video w-full ${block}`} />
                  <div className="flex flex-col gap-[6px]">
                    <div className={`h-[19px] w-full ${blockDark}`} />
                    <div className={`h-[19px] w-4/5 ${blockDark}`} />
                  </div>
                  <div className="flex flex-col gap-[4px]">
                    <div className={`h-[13px] w-full ${block}`} />
                    <div className={`h-[13px] w-5/6 ${block}`} />
                  </div>
                  <div className="mt-[2px] flex gap-[6px]">
                    <div className={`h-[22px] w-[80px] rounded-full ${block}`} />
                    <div className={`h-[22px] w-[65px] rounded-full ${block}`} />
                  </div>
                  <div className="mt-[4px] flex items-center justify-between">
                    <div className={`h-[12px] w-[90px] ${block}`} />
                    <div className={`h-[12px] w-[60px] ${block}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

// Uppercase section kicker under a full-width dark rule — the broadsheet
// section divider ("TOP STORIES", "TODAY, 16TH JULY").
function Kicker({ children, light = false }) {
  return (
    <div className={`mb-[20px] border-t ${light ? 'border-lm-300' : 'border-lm-800'} pt-[10px]`}>
      <h2 className={`font-roboto text-[13px] font-bold uppercase tracking-[0.1em] ${light ? 'text-lm-500' : 'text-[#0F0F11]'}`} style={rb}>
        {children}
      </h2>
    </div>
  )
}

// Big lead story — image, large serif headline, standfirst, meta.
function LeadStory({ item }) {
  return (
    <Link to={storyPath(item)} className="group flex w-full flex-col gap-[14px] text-left">
      {item.image && (
        <div className="aspect-video w-full overflow-hidden bg-lm-100">
          <img src={item.image} alt="" loading="lazy" onError={hideOnError} className="size-full object-cover" />
        </div>
      )}
      <h2 className="text-[28px] font-bold leading-[1.14] tracking-[-0.01em] text-black group-hover:underline sm:text-[34px]" style={serif}>
        {item.headline}
      </h2>
      <p className="line-clamp-3 font-roboto text-[15px] leading-[24px] text-lm-600" style={rb}>
        {item.body || item.summary}
      </p>
      <Meta item={item} />
    </Link>
  )
}

// Secondary story — size-stepped so the left column reads 2nd-then-3rd, not as
// two equals (BBC's hierarchy). `prominent` = image-top with a big headline and
// standfirst; otherwise a compact thumbnail row at every width. Mobile always
// collapses to the thumbnail row.
function SideStory({ item, prominent = false }) {
  if (!prominent) {
    return (
      <Link to={storyPath(item)} className="group flex w-full gap-[12px] text-left">
        {item.image && (
          <div className="h-[76px] w-[114px] shrink-0 overflow-hidden bg-lm-100">
            <img src={item.image} alt="" loading="lazy" onError={hideOnError} className="size-full object-cover" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <h3 className="line-clamp-3 text-[16px] font-bold leading-[1.24] text-black group-hover:underline sm:text-[17px]" style={serif}>
            {item.headline}
          </h3>
          <Meta item={item} />
        </div>
      </Link>
    )
  }
  return (
    <Link to={storyPath(item)} className="group flex w-full gap-[12px] text-left sm:flex-col sm:gap-[10px]">
      {item.image && (
        <div className="h-[82px] w-[124px] shrink-0 overflow-hidden bg-lm-100 sm:aspect-video sm:h-auto sm:w-full">
          <img src={item.image} alt="" loading="lazy" onError={hideOnError} className="size-full object-cover" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-[8px] sm:gap-[10px]">
        <h3 className="text-[19px] font-bold leading-[1.2] text-black group-hover:underline sm:text-[24px]" style={serif}>
          {item.headline}
        </h3>
        <p className="hidden font-roboto text-[13px] leading-[20px] text-lm-500 sm:line-clamp-2" style={rb}>
          {item.body || item.summary}
        </p>
        <Meta item={item} />
      </div>
    </Link>
  )
}

// Headline rail entry (right column) — text only.
function RailStory({ item }) {
  return (
    <Link to={storyPath(item)} className="group flex w-full flex-col gap-[6px] py-[16px] text-left first:pt-0 last:pb-0">
      <h3 className="line-clamp-3 text-[17px] font-bold leading-[1.25] text-black group-hover:underline" style={serif}>
        {item.headline}
      </h3>
      <p className="line-clamp-2 font-roboto text-[13px] leading-[20px] text-lm-500" style={rb}>
        {item.body || item.summary}
      </p>
      <Meta item={item} />
    </Link>
  )
}

// Flat feed card for the masonry below the band — image, serif headline, full
// brief, reading lenses, meta. No borders or shadows; a bottom hairline closes
// each card and column rules divide the gutters (broadsheet look).
function StudioCard({ item, onOpen }) {
  const lenses = availableLenses(item)
  const [lens, setLens] = useState(null)
  const activeLens = lens && lenses.some(([id]) => id === lens) ? lens : null
  return (
    <article onClick={onOpen} className="group cursor-pointer border-b border-lm-200 pb-[16px] sm:pb-[18px]">
      {/* BBC mobile list row: thumbnail left, headline + meta right. From sm up
          it stacks into the broadsheet column card (image top, brief, lenses). */}
      <div className="flex gap-[12px] sm:flex-col sm:gap-[10px]">
        {item.image && (
          <div className="h-[78px] w-[116px] shrink-0 overflow-hidden bg-lm-100 sm:aspect-video sm:h-auto sm:w-full">
            <img src={item.image} alt="" loading="lazy" onError={hideOnError} className="size-full object-cover" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-[6px] sm:gap-0">
          <h3 className="text-[17px] font-bold leading-[1.24] text-black group-hover:underline sm:text-[21px] sm:leading-[1.22]" style={serif}>
            {item.headline}
          </h3>
          <div className="sm:hidden"><Meta item={item} /></div>
        </div>
      </div>
      {/* Brief + reading lenses + full meta — desktop/tablet only; on mobile the
          row links straight to the story page (which carries the lenses). */}
      <div className="hidden sm:mt-[10px] sm:flex sm:flex-col sm:gap-[10px]">
        <ContentSwap item={item} lens={activeLens} size="sm" minH={56}>
          <Excerpt item={item} size="sm" onOpen={onOpen} full />
        </ContentSwap>
        {lenses.length > 0 && <LensPills lenses={lenses} active={activeLens} onPick={setLens} compact />}
        <div className="mt-[2px] flex flex-wrap items-center justify-between gap-[8px]">
          <Meta item={item} />
          <span className="font-roboto text-[12px] text-lm-400" style={rb}>{item.source}</span>
        </div>
      </div>
    </article>
  )
}

export default function LmNewsStudio({
  items: rawItems = [],
  loading = false,
  emptyLabel = 'No stories here yet — check back soon.',
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}) {
  // Collapse near-identical headlines (same story from different outlets) —
  // everything below, including the reader, works on the deduped feed.
  const items = useMemo(() => dedupeStories(rawItems), [rawItems])
  // The ticker and top band pick from the newest page only, so they stay put
  // while older pages stream in below.
  const head = useMemo(() => items.slice(0, FEED_PAGE_SIZE), [items])

  // Every story opens on its own page (/story/:id).
  const navigate = useNavigate()
  const openItem = (it) => navigate(storyPath(it))

  // Breaking banner — identical selection to the old General feed.
  const breaking = useMemo(() => {
    const hot = head.filter(isBreaking).sort((a, b) => breakingScore(b) - breakingScore(a)).slice(0, 6)
    if (hot.length > 0) return hot
    return [...head.slice(0, 10)].sort((a, b) => breakingScore(b) - breakingScore(a)).slice(0, 6)
  }, [head])

  // Hero band: hottest stories first; the lead must carry an image when any
  // story has one, the left pair prefers images, the rail is text-only.
  const { lead, side, rail, rest } = useMemo(() => {
    const ranked = [...head].sort((a, b) => breakingScore(b) - breakingScore(a))
    const lead = ranked.find((it) => it.image) || ranked[0] || null
    const used = new Set(lead ? [lead.id] : [])
    const withImg = ranked.filter((it) => !used.has(it.id) && it.image)
    const side = withImg.slice(0, 2)
    for (const it of ranked) {
      if (side.length >= 2) break
      if (!used.has(it.id) && !side.some((s) => s.id === it.id)) side.push(it)
    }
    side.forEach((it) => used.add(it.id))
    const rail = ranked.filter((it) => !used.has(it.id)).slice(0, 5)
    rail.forEach((it) => used.add(it.id))
    const rest = items.filter((it) => !used.has(it.id))
    return { lead, side, rail, rest }
  }, [head, items])

  // Date groups for everything below the band. Within each day, SECTION FRONTS
  // are derived automatically from the stories actually present: any topic with
  // 4+ stories that day earns its own band (kicker + its hottest 4), capped at
  // 3 bands so the page keeps rhythm; everything else flows into the day's
  // masonry. Entirely data-driven — when a story wave ends (the World Cup
  // wraps), its section simply stops qualifying and disappears.
  const groups = useMemo(() => {
    const byDay = new Map()
    for (const it of rest) {
      if (!it.publishedAt) continue
      const k = dayKey(it.publishedAt)
      if (!byDay.has(k)) byDay.set(k, [])
      byDay.get(k).push(it)
    }
    return [...byDay.entries()]
      .sort((a, b) => new Date(b[1][0].publishedAt) - new Date(a[1][0].publishedAt))
      .map(([k, arr]) => {
        const byTopic = new Map()
        for (const it of arr) {
          const label = topicLabel(it)
          if (!label) continue
          if (!byTopic.has(label)) byTopic.set(label, [])
          byTopic.get(label).push(it)
        }
        const sections = [...byTopic.entries()]
          .filter(([, list]) => list.length >= 4)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 3)
          .map(([label, list]) => ({
            label,
            items: [...list].sort((a, b) => breakingScore(b) - breakingScore(a)).slice(0, 4),
          }))
        const sectioned = new Set(sections.flatMap((s) => s.items.map((it) => it.id)))
        return {
          key: k,
          sections,
          items: arr.filter((it) => !sectioned.has(it.id)),
          ...headerLabel(arr[0].publishedAt),
        }
      })
  }, [rest])

  if (loading && items.length === 0) {
    return <StudioSkeleton />
  }
  if (items.length === 0) {
    return <div className="px-[32px] py-[80px] text-center font-roboto text-[18px] text-lm-500" style={rb}>{emptyLabel}</div>
  }

  return (
    <>
      {/* Broadcast ticker hugs the glass toolbar above (full-bleed) */}
      <LmBreakingTicker items={breaking} />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[44px] px-4 py-[32px] sm:px-8 sm:py-[48px] lg:px-[32px]">
      {/* ---- Top-stories band: [side pair | image lead | headline rail] ---- */}
      {lead && (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Kicker>Top stories</Kicker>
          <div className="grid gap-[28px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)_minmax(0,1fr)]">
            {/* Lead first on mobile, centred on desktop, flanked by hairlines */}
            <div className="order-1 lg:order-2 lg:border-x lg:border-lm-200 lg:px-[28px]">
              <LeadStory item={lead} />
            </div>
            {/* Size-stepped left column: 2nd story big, 3rd compact */}
            <div className="order-2 flex flex-col gap-[20px] divide-y divide-lm-200 lg:order-1 [&>*+*]:pt-[20px]">
              {side.map((it, i) => (
                <SideStory key={it.id} item={it} prominent={i === 0} />
              ))}
            </div>
            <div className="order-3 flex flex-col divide-y divide-lm-200">
              {rail.map((it) => (
                <RailStory key={it.id} item={it} />
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ---- The rest of the feed: per-day SECTION FRONTS (auto-derived from
           the day's topics — a section exists only while its story wave does)
           followed by the day's masonry ---- */}
      {groups.map((g) => (
        <motion.section
          key={g.key}
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Kicker light={!g.today}>{g.label}</Kicker>

          {g.sections.map((sec) => (
            <div key={sec.label} className="mb-[36px]">
              <div className="mb-[16px] flex items-center gap-[12px]">
                <h3 className="font-roboto text-[12px] font-bold uppercase tracking-[0.12em] text-[#3979FF]" style={rb}>
                  {sec.label}
                </h3>
                <div className="h-px flex-1 bg-lm-200" />
              </div>
              <div className="grid gap-[20px] sm:grid-cols-2 lg:grid-cols-4">
                {sec.items.map((it) => (
                  <StudioCard key={it.id} item={it} onOpen={() => openItem(it)} />
                ))}
              </div>
            </div>
          ))}

          {g.sections.length > 0 && g.items.length > 0 && (
            <div className="mb-[16px] flex items-center gap-[12px]">
              <h3 className="font-roboto text-[12px] font-bold uppercase tracking-[0.12em] text-lm-500" style={rb}>
                Also in news
              </h3>
              <div className="h-px flex-1 bg-lm-200" />
            </div>
          )}
          {/* Masonry via CSS columns with broadsheet column rules: an expanded
              card (open reading lens) only pushes down its OWN column. */}
          <div className="columns-1 gap-[32px] sm:columns-2 lg:columns-3 [column-rule:1px_solid_#E4E4E7]">
            {g.items.map((it) => (
              <div key={it.id} className="mb-[22px] break-inside-avoid">
                <StudioCard item={it} onOpen={() => openItem(it)} />
              </div>
            ))}
          </div>
        </motion.section>
      ))}

      <FeedTail hasMore={hasMore} loadingMore={loadingMore} onLoadMore={onLoadMore} count={rawItems.length} />
      </div>
    </>
  )
}
