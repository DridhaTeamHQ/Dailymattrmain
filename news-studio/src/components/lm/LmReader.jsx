import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { readTime } from '../../lib/readTime'
import { SLUG_LABEL, topicLabel } from '../../lib/content'
import { FactChip, FactPanel } from './LmFactBadge'

// Story page body (StoryPage renders it under the site nav). Every story is
// its own route: "Up next" entries are links, and the arrow keys step through
// the feed via `onIndex`, which navigates to the neighbouring story's page.
const rb = { fontVariationSettings: '"wdth" 100' }
// Same broadsheet serif as the News Studio front page, so a story reads as one
// continuous experience from card to reader.
const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }

// "30 mins ago" / "5 hrs ago" — same voice as the front page meta lines.
function timeAgo(iso) {
  if (!iso) return ''
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function favicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` } catch { return '' }
}

export default function LmReader({ items = [], index = 0, onIndex, onClose, pathFor }) {
  // Reading mode — Original plus whatever alternate versions were generated at
  // approval time ({ eli5, tldr[], deep_dive }). Key points/numbers are rendered
  // separately in their own dedicated highlight box on the left.
  const [mode, setMode] = useState('original')
  // 0..1 page scroll progress, shown as the thin bar under the header.
  const [progress, setProgress] = useState(0)
  const item = items[index]

  useEffect(() => {
    setMode('original')
  }, [item?.id])

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const track = el.scrollHeight - window.innerHeight
      setProgress(track > 0 ? Math.min(1, window.scrollY / track) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [item?.id])

  const go = (delta) => {
    const next = index + delta
    if (next < 0 || next >= items.length) return
    onIndex(next)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null
  const long = item.kind === 'case_study' || item.kind === 'feature'
  const hasImage = !!item.image

  const versions = item.versions || {}
  const MODES = [
    ['original', 'Original', true],
    ['eli5', "Explain like I'm 5", !!versions.eli5],
    ['tldr', '60-sec TL;DR', Array.isArray(versions.tldr) && versions.tldr.length > 0],
    ['deep_dive', 'Deep dive', !!versions.deep_dive],
  ].filter(([, , available]) => available)
  const activeMode = MODES.some(([id]) => id === mode) ? mode : 'original'

  const keyPoints = (Array.isArray(versions.key_numbers) && versions.key_numbers.length > 0)
    ? versions.key_numbers
    : (Array.isArray(versions.key_points) && versions.key_points.length > 0)
      ? versions.key_points
      : (Array.isArray(item.keyPoints) && item.keyPoints.length > 0)
        ? item.keyPoints
        : null

  const bodyText =
    activeMode === 'eli5' ? versions.eli5
      : activeMode === 'deep_dive' ? versions.deep_dive
        : String(item.body || item.summary || '')
  const bullets =
    activeMode === 'tldr' ? versions.tldr
      : null
  const paragraphs = String(bodyText || '').split(/\n{2,}/).filter(Boolean)
  const nextStories = items.slice(index + 1, index + 6)

  return (
    <div className="bg-white pt-[70px]">
      {/* Story header — sticks under the fixed site nav */}
      <div className="sticky top-[70px] z-40 flex items-center justify-between border-b border-lm-200 bg-white px-4 py-[12px] sm:px-8">
        <button
          type="button"
          onClick={onClose}
          className="group flex items-center gap-[8px] rounded-full border border-lm-300 bg-white px-[14px] py-[6px] font-roboto text-[13px] font-semibold text-lm-800 transition-all hover:border-lm-800 hover:bg-lm-800 hover:text-white"
          style={rb}
        >
          <span className="text-[16px] transition-transform duration-200 group-hover:-translate-x-[2px]">←</span>
          <span>Back</span>
        </button>
        <p className="font-roboto text-[11px] font-bold uppercase tracking-[0.14em] text-lm-500" style={rb}>
          {/* Site category name — not the scraper's internal feed tag (Business/Explained/…) */}
          {SLUG_LABEL[item.slug] || item.category || 'Story'}
          <span className="px-[8px] text-lm-300">·</span>
          <span className="text-lm-800">{index + 1}</span> / {items.length}
        </p>
        {item.sourceUrl ? (
          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="rounded-[100px] bg-lm-800 px-[14px] py-[8px] font-roboto text-[12px] font-semibold text-white transition-colors hover:bg-black" style={rb}>
            Source ↗
          </a>
        ) : <span className="w-[76px]" />}
        {/* Reading progress for the current story */}
        <div className="absolute inset-x-0 -bottom-[1px] h-[3px] bg-transparent">
          <div className="h-full bg-black transition-[width] duration-150 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <article key={item.id} className="px-4 pb-[80px] pt-[28px] sm:px-8 lg:px-12">
          <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-[36px] lg:flex-row lg:items-start lg:gap-[48px] xl:gap-[64px]">
            {/* LEFT / CENTER COLUMN: Main Article */}
            <main className="order-1 flex-1 min-w-0">
              {/* Section kicker — small uppercase, broadsheet style */}
              {(topicLabel(item) || long) && (
                <p className="font-roboto text-[12px] font-bold uppercase tracking-[0.12em] text-lm-500" style={rb}>
                  {long ? 'Long story' : topicLabel(item)}
                </p>
              )}
              <h1 className="pt-[12px] text-[30px] font-bold leading-[1.14] tracking-[-0.01em] text-black sm:text-[40px] lg:text-[42px]" style={serif}>
                {item.headline}
              </h1>
              {/* Meta line — same voice as the front page cards */}
              <p className="pt-[14px] font-roboto text-[13px] text-lm-500" style={rb}>
                {timeAgo(item.publishedAt)}
                {item.source && (
                  <>
                    <span className="px-[8px] text-lm-300">|</span>
                    <span className="font-medium text-lm-700">{item.source}</span>
                    {item.company ? ` · ${item.company}` : ''}
                  </>
                )}
                <span className="px-[8px] text-lm-300">|</span>
                {readTime(item.headline, item.body)} min read
              </p>
              <div className="mt-[12px]"><FactChip item={item} small /></div>
              {/* Editorial rule between the headline block and the body */}
              <div className="mt-[18px] h-[3px] w-[56px] bg-black" />

              {/* Lead image (General stories scraped with one) */}
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                  className="mt-[24px] max-h-[460px] w-full rounded-[16px] bg-lm-100 object-cover shadow-sm"
                />
              )}

              {/* Reading-mode switcher — only when alternate versions exist */}
              {MODES.length > 1 && (
                <div className="mt-[24px]">
                  <p className="font-roboto text-[11px] font-bold uppercase tracking-[0.14em] text-lm-400" style={rb}>Read it as</p>
                  <div className="mt-[8px] flex flex-wrap items-center gap-[6px] rounded-[24px] border border-lm-200 bg-lm-50 p-[5px] sm:w-fit sm:rounded-[100px]">
                    {MODES.map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMode(id)}
                        className={`rounded-[100px] px-[14px] py-[7px] font-bevietnam text-[13px] font-semibold transition-all duration-200 ${activeMode === id ? 'bg-lm-800 text-white shadow' : 'text-lm-500 hover:text-lm-800'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-[18px] pt-[26px]">
                {bullets ? (
                  <ul className="flex flex-col gap-[14px]">
                    {bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-[12px] font-roboto text-[17px] leading-[1.7] text-lm-700 sm:text-[18px]" style={rb}>
                        <span className="mt-[11px] size-[7px] shrink-0 rounded-full bg-lm-800" />
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : (
                  paragraphs.map((p, i) => (
                    // First paragraph is the lede — larger and darker, the rest settle
                    // into comfortable body copy.
                    <p
                      key={i}
                      className={i === 0
                        ? 'font-roboto text-[19px] leading-[1.65] text-lm-800 sm:text-[21px]'
                        : 'font-roboto text-[17px] leading-[1.7] text-lm-700 sm:text-[18px]'}
                      style={rb}
                    >
                      {p}
                    </p>
                  ))
                )}
              </div>
              <FactPanel item={item} />
              {item.sourceUrl && (
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-[32px] inline-flex items-center gap-[8px] rounded-[50px] border border-lm-300 px-[20px] py-[12px] font-roboto text-[14px] font-semibold text-lm-800 transition-colors hover:border-lm-800" style={rb}>
                  Read the full source ↗
                </a>
              )}
            </main>

            {/* RIGHT COLUMN: Key Points & Next Stories (Sidebar on Desktop) */}
            <aside className="order-2 flex w-full flex-col gap-[24px] lg:w-[380px] lg:shrink-0 xl:w-[420px]">
              {/* Key Points / Highlights — shown on the right */}
              {keyPoints && keyPoints.length > 0 && (
                <div className="rounded-[16px] border border-lm-200 bg-lm-50/90 p-[18px] shadow-sm sm:p-[22px]">
                  <div className="flex items-center gap-[8px] border-b border-lm-200/80 pb-[12px]">
                    <span className="flex size-[22px] items-center justify-center rounded-full bg-lm-800 text-[11px] text-white">✦</span>
                    <p className="font-roboto text-[12px] font-bold uppercase tracking-[0.14em] text-lm-800" style={rb}>
                      Key Points & Numbers
                    </p>
                  </div>
                  <ul className="mt-[14px] flex flex-col gap-[10px]">
                    {keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-[10px] font-roboto text-[14px] leading-[1.6] text-lm-700 sm:text-[15px]" style={rb}>
                        <span className="mt-[8px] size-[5px] shrink-0 rounded-full bg-lm-800" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next 5 Stories on the right */}
              {nextStories.length > 0 && (
                <div className="rounded-[16px] border border-lm-200 bg-white p-[18px] shadow-sm sm:p-[20px]">
                  <div className="flex items-center justify-between border-b border-lm-200/80 pb-[12px]">
                    <span className="font-roboto text-[12px] font-bold uppercase tracking-[0.14em] text-lm-600" style={rb}>
                      Up Next · {nextStories.length} {nextStories.length === 1 ? 'Story' : 'Stories'}
                    </span>
                    <span className="font-roboto text-[11px] text-lm-400" style={rb}>
                      Tap to open
                    </span>
                  </div>

                  <div className="mt-[14px] flex flex-col gap-[12px]">
                    {nextStories.map((story, i) => {
                      const targetIdx = index + 1 + i
                      const mins = readTime(story.headline, story.body)
                      const label = topicLabel(story) || (story.category ? story.category : null)
                      const ico = favicon(story.sourceUrl)

                      return (
                        <Link
                          key={story.id || targetIdx}
                          to={pathFor(story)}
                          className="group flex w-full items-start gap-[12px] rounded-[12px] border border-lm-100 bg-lm-50/40 p-[12px] text-left transition-all duration-200 hover:border-lm-800 hover:bg-white hover:shadow-[0px_6px_20px_rgba(0,0,0,0.06)]"
                        >
                          {/* Story Thumbnail (if available) */}
                          {story.image ? (
                            <div className="relative size-[68px] shrink-0 overflow-hidden rounded-[10px] bg-lm-100 sm:size-[76px]">
                              <img
                                src={story.image}
                                alt=""
                                loading="lazy"
                                onError={(e) => {
                                  if (e.currentTarget.parentElement) {
                                    e.currentTarget.parentElement.style.display = 'none'
                                  }
                                }}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                          ) : null}

                          {/* Story Content */}
                          <div className="flex flex-1 flex-col justify-between min-w-0">
                            <div>
                              <div className="flex flex-wrap items-center gap-[6px]">
                                {label && (
                                  <span className="rounded-full bg-black/5 px-[7px] py-[2px] font-roboto text-[9px] font-bold uppercase tracking-[0.07em] text-lm-700" style={rb}>
                                    {label}
                                  </span>
                                )}
                                <span className="font-roboto text-[11px] text-lm-400" style={rb}>
                                  {timeAgo(story.publishedAt)}
                                </span>
                              </div>

                              <h4
                                className="mt-[5px] line-clamp-2 font-roboto text-[14px] font-bold leading-[1.35] text-lm-900 transition-colors group-hover:text-black"
                                style={rb}
                              >
                                {story.headline}
                              </h4>
                            </div>

                            <div className="mt-[8px] flex items-center justify-between pt-[2px]">
                              <div className="flex items-center gap-[5px] font-roboto text-[11px] text-lm-500" style={rb}>
                                {ico && <img alt="" src={ico} className="size-[13px] rounded-full border border-white bg-white" loading="lazy" />}
                                <span className="truncate max-w-[120px] font-medium text-lm-700">{story.source || 'Source'}</span>
                                <span className="text-lm-300">·</span>
                                <span>{mins}m</span>
                              </div>

                              <span className="font-roboto text-[13px] text-lm-400 transition-transform group-hover:translate-x-[2px] group-hover:text-black">
                                →
                              </span>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </aside>
          </div>
      </article>
    </div>
  )
}
