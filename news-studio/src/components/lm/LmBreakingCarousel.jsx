import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// Breaking-news banner for the General feed — a dark rounded bar that rotates
// through the day's top stories with a smooth slide/fade, a pulsing BREAKING
// chip, a linear progress bar per story, and dot navigation. Pauses on hover;
// clicking the headline opens that story's page.
// Headline swap uses a keyed remount (initial -> animate) — deliberately no
// AnimatePresence exits, which proved unreliable in this app (see LmReader).
const rb = { fontVariationSettings: '"wdth" 100' }
const ROTATE_MS = 5000

export default function LmBreakingCarousel({ items = [], onOpen }) {
  const stories = items.slice(0, 6)
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || stories.length < 2) return
    const t = setInterval(() => setIdx((i) => (i + 1) % stories.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [paused, stories.length])

  if (stories.length === 0) return null
  const story = stories[idx % stories.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-[20px] overflow-hidden rounded-[16px] bg-gradient-to-r from-[#0f0f12] via-lm-800 to-[#1c1c22] text-white shadow-[0px_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-white/5 sm:mb-[28px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* faint red glow anchored at the BREAKING chip */}
      <span className="pointer-events-none absolute -left-[30px] top-1/2 h-[120px] w-[160px] -translate-y-1/2 rounded-full bg-[#E33B3B] opacity-[0.14] blur-[40px]" aria-hidden="true" />
      <div className="relative z-[1] flex items-center gap-[12px] px-[16px] py-[14px] sm:gap-[18px] sm:px-[22px]">
        <span
          className="flex shrink-0 items-center gap-[7px] rounded-full bg-[#E33B3B] px-[11px] py-[5px] font-roboto text-[10px] font-bold uppercase tracking-[0.09em] text-white"
          style={rb}
        >
          <motion.span
            className="size-[6px] rounded-full bg-white"
            animate={{ opacity: [1, 0.15, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          Breaking
        </span>

        {/* right-edge fade so a truncated headline reads as intentional */}
        <div className="relative min-h-[26px] flex-1 overflow-hidden after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-[40px] after:bg-gradient-to-l after:from-[#1a1a20] after:to-transparent">
          <motion.button
            key={story.id}
            type="button"
            onClick={() => onOpen?.(story)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="block w-full truncate pr-[24px] text-left font-roboto text-[15px] font-semibold text-white hover:underline sm:text-[17px]"
            style={rb}
            title={story.headline}
          >
            {story.headline}
          </motion.button>
        </div>

        {stories.length > 1 && (
          <div className="hidden shrink-0 items-center gap-[6px] sm:flex">
            {stories.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Show story ${i + 1}`}
                className={`h-[6px] rounded-full transition-all duration-300 ${
                  i === idx % stories.length ? 'w-[22px] bg-white' : 'w-[6px] bg-white/35 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Per-story progress bar (hidden while hovered/paused) */}
      {!paused && stories.length > 1 && (
        <motion.div
          key={idx}
          className="absolute bottom-0 left-0 h-[2px] rounded-full bg-white/50"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: ROTATE_MS / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  )
}
