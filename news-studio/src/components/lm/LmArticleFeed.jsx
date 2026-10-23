import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { readTime } from '../../lib/readTime'
import { useNavigate } from 'react-router-dom'
import { storyPath } from '../../lib/routes'
import LmBreakingCarousel from './LmBreakingCarousel'
import { FactChip } from './LmFactBadge'
import { breakingScore, isBreaking, topicLabel, istDayKey } from '../../lib/content'

// Date-grouped article feed — Figma node 1:5453. Each date group: bold header
// with hairline divider, then a two-column grid — left 895px (2 featured +
// 2 half cards), right 473px (3 compact cards). White cards, radius 16;
// the day's lead card carries a solid #141417 border.
const rb = { fontVariationSettings: '"wdth" 100' }
const IST = 'Asia/Kolkata'

// One IST day key for the whole site (content.js owns it) — re-exported here
// because LmNewsStudio and this feed both group by it.
export const dayKey = istDayKey
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
export function headerLabel(iso) {
  const d = new Date(iso)
  const today = dayKey(new Date().toISOString()) === dayKey(iso)
  const day = Number(d.toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric' }))
  const month = d.toLocaleDateString('en-IN', { timeZone: IST, month: 'long' })
  const year = d.toLocaleDateString('en-IN', { timeZone: IST, year: 'numeric' })
  const weekday = d.toLocaleDateString('en-IN', { timeZone: IST, weekday: 'long' })
  return { label: `${today ? 'Today' : weekday}, ${ordinal(day)} ${month}, ${year}`, today }
}

function favicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` } catch { return '' }
}

export function SourceRow({ item }) {
  const ico = favicon(item.sourceUrl)
  return (
    <div className="flex items-center gap-[8px]">
      {ico && <img alt="" src={ico} className="size-[16px] rounded-full border border-white bg-white" loading="lazy" />}
      <a
        href={item.sourceUrl || '#'}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="font-roboto text-[16px] leading-[25px] text-lm-500 hover:text-lm-800"
        style={rb}
      >
        {item.source || 'Source'}
      </a>
    </div>
  )
}

export function TopicChip({ item }) {
  const label = topicLabel(item)
  if (!label) return null
  return (
    <span className="rounded-full bg-black/5 px-[10px] py-[3px] font-roboto text-[10px] font-bold uppercase tracking-[0.07em] text-lm-700" style={rb}>
      {label}
    </span>
  )
}

// Small, flat, editorial meta pills — the topic tag (National/World/Business…)
// leads, then a monochrome outline for "min read", a confident solid-black pill
// for long reads, and the fact chip (its band colour is the only colour in the
// row). Uppercase micro-labels, letter-spaced.
export function Tags({ item }) {
  const mins = readTime(item.headline, item.body)
  const long = item.kind === 'case_study' || item.kind === 'feature'
  return (
    <div className="flex flex-wrap items-center gap-[6px]">
      <TopicChip item={item} />
      {long && (
        <span className="rounded-full bg-lm-800 px-[10px] py-[3px] font-roboto text-[10px] font-bold uppercase tracking-[0.07em] text-white" style={rb}>
          Long read
        </span>
      )}
      <span className="rounded-full border border-lm-200 px-[10px] py-[3px] font-roboto text-[10px] font-bold uppercase tracking-[0.07em] text-lm-500" style={rb}>
        {mins} min read
      </span>
      <FactChip item={item} />
    </div>
  )
}

export function Excerpt({ item, size = 'lg', onOpen, full = false }) {
  const text = item.body || item.summary || ''
  const cls = size === 'lg' ? 'text-[18px] leading-[30px]' : 'text-[16px] leading-[25px]'
  const limit = size === 'lg' ? 260 : 150
  const clipped = !full && text.length > limit
  // General cards show the WHOLE brief (they're 55-85 words) — no "Read more".
  // Kept a touch smaller than the category-page excerpt so the full-brief cards
  // stay compact.
  if (full) {
    const fcls = size === 'lg' ? 'text-[15px] leading-[24px]' : 'text-[14px] leading-[22px]'
    return (
      <p className={`font-roboto ${fcls} text-lm-600`} style={rb}>{text}</p>
    )
  }
  return (
    <p className={`font-roboto ${cls} text-lm-500`} style={rb}>
      {clipped ? `${text.slice(0, limit).trimEnd()}… ` : `${text} `}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen?.() }}
        className="font-roboto font-medium text-lm-700 hover:underline"
        style={rb}
      >
        Read more
      </button>
    </p>
  )
}

// ---- Alternate reading lenses (General only — versions exist only there) ----
// A small pill row on the card ("✦ Explain like I'm 5", …). Picking one expands
// the card in place: original stays put, the chosen version renders in a tinted
// panel — side by side on wide cards, stacked on narrow ones.
const LENSES = [
  ['eli5', "Explain like I'm 5"],
  ['tldr', '60-sec TL;DR'],
  ['key_numbers', 'Key numbers'],
  ['deep_dive', 'Deep dive'],
]

export function availableLenses(item) {
  const v = item?.versions || {}
  return LENSES.filter(([id]) =>
    id === 'tldr' || id === 'key_numbers'
      ? Array.isArray(v[id]) && v[id].length > 0
      : typeof v[id] === 'string' && v[id].trim().length > 0
  )
}

// A tiny confetti of dots + ✦ sparks that bursts out of a lens pill when it's
// activated. Pure framer-motion (no canvas); unmounts itself via the parent's
// burst key changing.
const PARTICLE_COLORS = ['#7900D9', '#141417', '#C49F17', '#0F9D69', '#E33B3B']
function ParticleBurst() {
  const parts = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2 + (i % 3) * 0.4
    const dist = 26 + ((i * 7919) % 24)
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      c: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      s: 3 + (i % 3) * 1.5,
      star: i % 5 === 0,
      d: 0.5 + (i % 4) * 0.09,
    }
  })
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 z-10" aria-hidden="true">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute"
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.15, rotate: p.star ? 180 : 0 }}
          transition={{ duration: p.d, ease: 'easeOut' }}
          style={
            p.star
              ? { color: p.c, fontSize: 11, lineHeight: 1 }
              : { width: p.s, height: p.s, borderRadius: 9999, background: p.c }
          }
        >
          {p.star ? '✦' : null}
        </motion.span>
      ))}
    </span>
  )
}

export function LensPills({ lenses, active, onPick, compact = false }) {
  // Bumps on every activation so the burst re-fires even on the same pill.
  const [burst, setBurst] = useState(null)
  return (
    <div className="flex flex-wrap items-center gap-[6px]" onClick={(e) => e.stopPropagation()}>
      <span className="font-roboto text-[12px] font-bold uppercase tracking-wide text-lm-400" style={rb}>✦</span>
      {lenses.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            const next = active === id ? null : id
            if (next) setBurst({ id, n: (burst?.n || 0) + 1 })
            onPick(next)
          }}
          className={`relative rounded-[100px] border font-bevietnam font-semibold transition-all duration-200 active:scale-95 ${
            compact ? 'px-[10px] py-[4px] text-[11px]' : 'px-[12px] py-[5px] text-[12px]'
          } ${
            active === id
              ? 'border-lm-800 bg-lm-800 text-white shadow'
              : 'border-lm-300 bg-white text-lm-500 hover:border-lm-500 hover:text-lm-800'
          }`}
        >
          {burst && burst.id === id && active === id && <ParticleBurst key={burst.n} />}
          {label}
        </button>
      ))}
    </div>
  )
}

// The brief and its alternate lenses share ONE content box — picking a lens
// swaps the text in place (never opening a second panel or resizing the card
// sideways). `ContentSwap` crossfades between the two and lets the box glide to
// the new height via framer's `layout`, so the card stays put and only its
// content changes. Keyed remount (initial -> animate, no AnimatePresence exit)
// matches the rest of the app.
const swapTransition = { duration: 0.34, ease: [0.22, 1, 0.36, 1] }

function LensBody({ item, lens, size = 'lg' }) {
  const v = item.versions || {}
  const label = (LENSES.find(([id]) => id === lens) || [])[1] || ''
  const bullets = lens === 'tldr' ? v.tldr : lens === 'key_numbers' ? v.key_numbers : null
  const text = lens === 'eli5' ? v.eli5 : lens === 'deep_dive' ? v.deep_dive : ''
  const paragraphs = String(text || '').split(/\n{2,}/).filter(Boolean)
  const tcls = size === 'lg' ? 'text-[15px] leading-[24px]' : 'text-[14px] leading-[22px]'
  return (
    <div className="flex flex-col gap-[8px]" onClick={(e) => e.stopPropagation()}>
      <span className="inline-flex w-fit items-center gap-[5px] rounded-full bg-[rgba(121,0,217,0.08)] px-[9px] py-[3px] font-roboto text-[10px] font-bold uppercase tracking-[0.06em] text-[#7900D9]" style={rb}>
        ✦ {label}
      </span>
      {bullets ? (
        <ul className="flex flex-col gap-[8px]">
          {bullets.map((b, i) => (
            <li key={i} className={`flex items-start gap-[10px] font-roboto ${tcls} text-lm-700`} style={rb}>
              <span className="mt-[8px] size-[6px] shrink-0 rounded-full bg-[#7900D9]" />
              {b}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {paragraphs.map((p, i) => (
            <p key={i} className={`font-roboto ${tcls} text-lm-700`} style={rb}>{p}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// Shared swap wrapper — same box for original + every lens, smooth height glide.
export function ContentSwap({ item, lens, size, minH, children }) {
  return (
    <motion.div layout transition={{ layout: swapTransition }} className="relative" style={{ minHeight: minH }}>
      <motion.div
        key={lens || 'original'}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={swapTransition}
      >
        {lens ? <LensBody item={item} lens={lens} size={size} /> : children}
      </motion.div>
    </motion.div>
  )
}

function FeaturedCard({ item, lead = false, half = false, onOpen, fullStories = false }) {
  const lenses = fullStories ? availableLenses(item) : []
  const [lens, setLens] = useState(null)
  const activeLens = lens && lenses.some(([id]) => id === lens) ? lens : null
  // General (fullStories) cards carry the whole brief, so they run tighter than
  // the big category-page Figma cards: less padding, smaller headline/gaps.
  const pad = fullStories ? 'p-[16px] sm:p-[20px]' : 'p-[20px] sm:p-[32px]'
  const gap = fullStories ? 'gap-[14px]' : 'gap-[24px]'
  const headCls = half
    ? 'text-[19px] leading-[26px]'
    : fullStories
      ? 'text-[20px] leading-[27px] sm:text-[22px] sm:leading-[30px]'
      : 'text-[24px] leading-[34px] sm:text-[32px] sm:leading-[44px]'
  return (
    <article
      onClick={onOpen}
      className={`flex cursor-pointer flex-col ${gap} rounded-[16px] bg-white ${pad} transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:shadow-[0px_14px_36px_rgba(0,0,0,0.09)] ${
        lead ? 'border border-lm-800' : 'border border-[rgba(28,28,30,0.1)] hover:border-[rgba(28,28,30,0.25)]'
      }`}
    >
      {half ? (
        <div className="flex flex-wrap items-center gap-[6px]">
          <TopicChip item={item} />
          <FactChip item={item} small />
        </div>
      ) : <Tags item={item} />}
      <h3 className={`font-roboto font-bold text-black ${headCls}`} style={rb}>
        {item.headline}
      </h3>
      {/* Brief and lenses share ONE box — no side panel, no width change */}
      <ContentSwap item={item} lens={activeLens} size={half ? 'sm' : 'lg'} minH={half ? 64 : 88}>
        <Excerpt item={item} size={half ? 'sm' : 'lg'} onOpen={onOpen} full={fullStories} />
      </ContentSwap>
      {lenses.length > 0 && <LensPills lenses={lenses} active={activeLens} onPick={setLens} compact={half} />}
      <SourceRow item={item} />
    </article>
  )
}

function CompactCard({ item, onOpen, fullStories = false }) {
  const lenses = fullStories ? availableLenses(item) : []
  const [lens, setLens] = useState(null)
  const activeLens = lens && lenses.some(([id]) => id === lens) ? lens : null
  return (
    <article onClick={onOpen} className="flex cursor-pointer flex-col gap-[8px] rounded-[16px] border border-[rgba(28,28,30,0.1)] bg-white p-[16px] transition-shadow hover:shadow-[0px_10px_30px_rgba(0,0,0,0.07)]">
      {(item.factScore != null || topicLabel(item)) && (
        <div className="flex flex-wrap items-center gap-[6px]">
          <TopicChip item={item} />
          <FactChip item={item} small />
        </div>
      )}
      <h3 className="font-roboto text-[21px] font-semibold leading-[1.36] text-black" style={rb}>{item.headline}</h3>
      <ContentSwap item={item} lens={activeLens} size="sm" minH={56}>
        <Excerpt item={item} size="sm" onOpen={onOpen} full={fullStories} />
      </ContentSwap>
      {lenses.length > 0 && <LensPills lenses={lenses} active={activeLens} onPick={setLens} compact />}
      <SourceRow item={item} />
    </article>
  )
}

// One "block" = up to 7 items laid out per the design.
function Block({ items, onOpen, fullStories }) {
  const [lead, second, halfA, halfB, ...compacts] = items
  return (
    // 895:473 columns in the 1440 design — keep the ratio fluid on laptops.
    <div className="flex flex-col gap-[8px] lg:grid lg:grid-cols-[minmax(0,1.89fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-[8px]">
        {lead && <FeaturedCard item={lead} lead onOpen={() => onOpen(lead)} fullStories={fullStories} />}
        {second && <FeaturedCard item={second} onOpen={() => onOpen(second)} fullStories={fullStories} />}
        {(halfA || halfB) && (
          <div className="flex flex-col gap-[8px] sm:flex-row">
            {halfA && <div className="flex-1"><FeaturedCard item={halfA} half onOpen={() => onOpen(halfA)} fullStories={fullStories} /></div>}
            {halfB && <div className="flex-1"><FeaturedCard item={halfB} half onOpen={() => onOpen(halfB)} fullStories={fullStories} /></div>}
          </div>
        )}
      </div>
      {compacts.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          {compacts.map((c) => <CompactCard key={c.id} item={c} onOpen={() => onOpen(c)} fullStories={fullStories} />)}
        </div>
      )}
    </div>
  )
}

// Skeleton loader for category news feed matching the exact Figma 2-column card grid
export function ArticleFeedSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[40px] px-4 py-[32px] sm:gap-[64px] sm:px-8 sm:py-[48px] lg:px-[32px]" aria-hidden="true">
      <div>
        {/* Date header skeleton */}
        <div className="mb-[16px] flex items-center gap-[16px]">
          <div className="skeleton-shimmer h-[26px] sm:h-[34px] w-[180px] sm:w-[240px] rounded-[6px]" />
          <div className="h-px flex-1 bg-lm-200" />
        </div>

        {/* Two-column grid matching Figma / live feed */}
        <div className="flex flex-col gap-[8px] lg:grid lg:grid-cols-[minmax(0,1.89fr)_minmax(0,1fr)]">
          {/* Left Column (Wide) */}
          <div className="flex flex-col gap-[8px]">
            {/* Lead Featured Card */}
            <div className="flex flex-col gap-[20px] rounded-[16px] border border-lm-800 bg-white p-[20px] sm:p-[32px]">
              {/* Tags row */}
              <div className="flex flex-wrap items-center gap-[6px]">
                <div className="skeleton-shimmer-dark h-[22px] w-[84px] rounded-full" />
                <div className="skeleton-shimmer h-[22px] w-[76px] rounded-full" />
                <div className="skeleton-shimmer h-[22px] w-[64px] rounded-full" />
              </div>
              {/* Headline */}
              <div className="flex flex-col gap-[10px]">
                <div className="skeleton-shimmer-dark h-[26px] sm:h-[34px] w-11/12 rounded-[6px]" />
                <div className="skeleton-shimmer-dark h-[26px] sm:h-[34px] w-4/5 rounded-[6px]" />
              </div>
              {/* Excerpt */}
              <div className="flex flex-col gap-[8px]">
                <div className="skeleton-shimmer h-[16px] w-full rounded-[4px]" />
                <div className="skeleton-shimmer h-[16px] w-11/12 rounded-[4px]" />
                <div className="skeleton-shimmer h-[16px] w-3/4 rounded-[4px]" />
              </div>
              {/* Source row */}
              <div className="flex items-center gap-[8px]">
                <div className="skeleton-shimmer size-[16px] rounded-full" />
                <div className="skeleton-shimmer h-[14px] w-[130px] rounded-[4px]" />
              </div>
            </div>

            {/* Second Featured Card */}
            <div className="flex flex-col gap-[20px] rounded-[16px] border border-[rgba(28,28,30,0.1)] bg-white p-[20px] sm:p-[32px]">
              <div className="flex flex-wrap items-center gap-[6px]">
                <div className="skeleton-shimmer-dark h-[22px] w-[84px] rounded-full" />
                <div className="skeleton-shimmer h-[22px] w-[76px] rounded-full" />
              </div>
              <div className="flex flex-col gap-[10px]">
                <div className="skeleton-shimmer-dark h-[26px] sm:h-[34px] w-full rounded-[6px]" />
                <div className="skeleton-shimmer-dark h-[26px] sm:h-[34px] w-3/4 rounded-[6px]" />
              </div>
              <div className="flex flex-col gap-[8px]">
                <div className="skeleton-shimmer h-[16px] w-full rounded-[4px]" />
                <div className="skeleton-shimmer h-[16px] w-5/6 rounded-[4px]" />
              </div>
              <div className="flex items-center gap-[8px]">
                <div className="skeleton-shimmer size-[16px] rounded-full" />
                <div className="skeleton-shimmer h-[14px] w-[140px] rounded-[4px]" />
              </div>
            </div>

            {/* Two Half Cards */}
            <div className="flex flex-col gap-[8px] sm:flex-row">
              {/* Half Card 1 */}
              <div className="flex flex-1 flex-col gap-[14px] rounded-[16px] border border-[rgba(28,28,30,0.1)] bg-white p-[20px]">
                <div className="flex flex-wrap items-center gap-[6px]">
                  <div className="skeleton-shimmer h-[20px] w-[64px] rounded-full" />
                  <div className="skeleton-shimmer h-[20px] w-[54px] rounded-full" />
                </div>
                <div className="flex flex-col gap-[8px]">
                  <div className="skeleton-shimmer-dark h-[20px] w-full rounded-[5px]" />
                  <div className="skeleton-shimmer-dark h-[20px] w-4/5 rounded-[5px]" />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <div className="skeleton-shimmer h-[14px] w-full rounded-[4px]" />
                  <div className="skeleton-shimmer h-[14px] w-2/3 rounded-[4px]" />
                </div>
                <div className="flex items-center gap-[8px]">
                  <div className="skeleton-shimmer size-[16px] rounded-full" />
                  <div className="skeleton-shimmer h-[14px] w-[90px] rounded-[4px]" />
                </div>
              </div>

              {/* Half Card 2 */}
              <div className="flex flex-1 flex-col gap-[14px] rounded-[16px] border border-[rgba(28,28,30,0.1)] bg-white p-[20px]">
                <div className="flex flex-wrap items-center gap-[6px]">
                  <div className="skeleton-shimmer h-[20px] w-[64px] rounded-full" />
                  <div className="skeleton-shimmer h-[20px] w-[54px] rounded-full" />
                </div>
                <div className="flex flex-col gap-[8px]">
                  <div className="skeleton-shimmer-dark h-[20px] w-full rounded-[5px]" />
                  <div className="skeleton-shimmer-dark h-[20px] w-3/4 rounded-[5px]" />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <div className="skeleton-shimmer h-[14px] w-full rounded-[4px]" />
                  <div className="skeleton-shimmer h-[14px] w-4/5 rounded-[4px]" />
                </div>
                <div className="flex items-center gap-[8px]">
                  <div className="skeleton-shimmer size-[16px] rounded-full" />
                  <div className="skeleton-shimmer h-[14px] w-[100px] rounded-[4px]" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Compact Cards) */}
          <div className="flex flex-col gap-[8px]">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="flex flex-col gap-[10px] rounded-[16px] border border-[rgba(28,28,30,0.1)] bg-white p-[16px]">
                <div className="flex flex-wrap items-center gap-[6px]">
                  <div className="skeleton-shimmer h-[18px] w-[70px] rounded-full" />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <div className="skeleton-shimmer-dark h-[20px] w-full rounded-[5px]" />
                  <div className="skeleton-shimmer-dark h-[20px] w-4/5 rounded-[5px]" />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <div className="skeleton-shimmer h-[14px] w-full rounded-[4px]" />
                  <div className="skeleton-shimmer h-[14px] w-5/6 rounded-[4px]" />
                </div>
                <div className="flex items-center gap-[8px]">
                  <div className="skeleton-shimmer size-[16px] rounded-full" />
                  <div className="skeleton-shimmer h-[12px] w-[100px] rounded-[4px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// fullStories: General mode — cards carry the complete brief (no Read more)
// plus the alternate-reading lens pills.
export default function LmArticleFeed({ items = [], loading = false, emptyLabel = 'No stories here yet — check back soon.', fullStories = false }) {
  const groups = useMemo(() => {
    const byDay = new Map()
    for (const it of items) {
      if (!it.publishedAt) continue
      const k = dayKey(it.publishedAt)
      if (!byDay.has(k)) byDay.set(k, [])
      byDay.get(k).push(it)
    }
    return [...byDay.entries()]
      .sort((a, b) => new Date(b[1][0].publishedAt) - new Date(a[1][0].publishedAt))
      .map(([k, arr]) => ({ key: k, items: arr, ...headerLabel(arr[0].publishedAt) }))
  }, [items])

  const [visible, setVisible] = useState(2)
  const shown = groups.slice(0, visible)
  const hasMore = groups.length > visible

  // Every story opens on its own page (/story/:id).
  const navigate = useNavigate()
  const openItem = (it) => navigate(storyPath(it))

  // Breaking banner (General only) — the real algorithm: editor prominence x
  // cross-outlet velocity x fact trust, freshness-decayed (mirrors the
  // breaking_news SQL view). Falls back to the newest stories when nothing
  // currently qualifies, so the banner never sits empty.
  const breaking = useMemo(() => {
    if (!fullStories) return []
    const hot = items.filter(isBreaking).sort((a, b) => breakingScore(b) - breakingScore(a)).slice(0, 6)
    if (hot.length > 0) return hot
    return [...items.slice(0, 10)]
      .sort((a, b) => breakingScore(b) - breakingScore(a))
      .slice(0, 6)
  }, [items, fullStories])

  if (loading && items.length === 0) {
    return <ArticleFeedSkeleton />
  }
  if (!loading && items.length === 0) {
    return <div className="px-[32px] py-[80px] text-center font-roboto text-[18px] text-lm-500" style={rb}>{emptyLabel}</div>
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[40px] px-4 py-[32px] sm:gap-[64px] sm:px-8 sm:py-[48px] lg:px-[32px]">
      {fullStories && breaking.length > 0 && (
        <div className="-mb-[24px] sm:-mb-[44px]">
          <LmBreakingCarousel items={breaking} onOpen={openItem} />
        </div>
      )}
      {shown.map((g, gi) => (
        <motion.section
          key={g.key}
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Date header */}
          <div className="mb-[16px] flex items-center gap-[16px]">
            <h2 className={`whitespace-nowrap font-roboto text-[18px] font-bold leading-[44px] sm:text-[24px] sm:leading-[64px] ${g.today ? 'text-[#0F0F11]' : 'text-lm-500'}`} style={rb}>
              {g.label}
            </h2>
            <div className="h-px flex-1 bg-lm-400" />
          </div>
          {/* General: equal cards SIDE BY SIDE (a lens-expanded card takes the
              full row); other categories keep the Figma 1.89fr/1fr blocks. */}
          {fullStories ? (
            <div className="grid gap-[8px] lg:grid-cols-2 lg:[grid-auto-flow:dense]">
              {g.items.map((it, i2) => (
                <FeaturedCard key={it.id} item={it} lead={gi === 0 && i2 === 0} onOpen={() => openItem(it)} fullStories />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {Array.from({ length: Math.ceil(g.items.length / 7) }, (_, i) => (
                <Block key={i} items={g.items.slice(i * 7, i * 7 + 7)} onOpen={openItem} fullStories={fullStories} />
              ))}
            </div>
          )}
        </motion.section>
      ))}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + 2)}
            className="group inline-flex items-center gap-[10px] rounded-full border border-lm-300 bg-white py-[8px] pl-[20px] pr-[8px] font-roboto text-[14px] font-semibold text-lm-800 transition-all duration-200 hover:border-lm-800 hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)]"
            style={rb}
          >
            Load more stories
            <span className="flex size-[30px] items-center justify-center rounded-full bg-lm-800 text-white transition-transform duration-300 group-hover:translate-y-[2px]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
