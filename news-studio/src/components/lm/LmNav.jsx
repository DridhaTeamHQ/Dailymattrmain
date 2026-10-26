import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLmDrawer } from './LmDrawerContext'

// Top nav — the same bar as the main dailymattr site (.nav in src/style.css):
// logo + "Stories that mattr" tagline, the site links, white glass. Only the
// right side is News Studio's own: the Subscribe (drawer) pill.
const GLOW = '/news-studio/figma/nav-button-glow.svg'

function Glow() {
  return (
    <span aria-hidden className="pointer-events-none absolute left-[-70px] top-[63px] h-[8px] w-[251px]">
      <img alt="" src={GLOW} className="block size-full max-w-none" />
    </span>
  )
}

// Main-site pages, so plain <a> (not router Links, which would add /news-studio).
const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'What we do', href: '/#showcase' },
  { label: 'Our features', href: '/#features' },
  { label: 'News', href: '/news/' },
  { label: 'Newsletter', href: '/newsletter/' },
  { label: 'Support', href: '/support/' },
]

// `collapsed` slides the whole bar out of view once the reader has scrolled —
// pages that carry their own sticky toolbar (LmCategoryBar) pass it so that
// toolbar becomes the top-most chrome while reading. Never collapses while a
// menu is open, or the menu would vanish under the viewport edge mid-interaction.
export default function LmNav({ collapsed = false }) {
  const { openSubscribe } = useLmDrawer()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Keep the bar put while the mobile sheet is open.
  const hidden = collapsed && !mobileOpen

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 bg-white/[.94] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] min-[901px]:bg-white/[.85] min-[901px]:backdrop-blur-[14px] ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="flex h-[70px] items-center justify-between px-[clamp(16px,5vw,28px)] min-[901px]:px-[56px]">
        <a href="/" aria-label="dailymattr home" className="flex flex-col items-center justify-center gap-[2px]">
          <img src="/assets/publisher-logo.png" width="156" height="32" alt="dailymattr" className="block h-[32px] w-[156px] flex-none" />
          <span className="block whitespace-nowrap text-center font-bevietnam text-[7.7px] font-medium uppercase leading-[12px] tracking-[1px] text-[#3979ff]">
            Stories that mattr
          </span>
        </a>

        {/* Center links — desktop */}
        <nav className="hidden gap-[6px] min-[901px]:flex">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="inline-flex items-center rounded-full px-[12px] py-[8px] font-bevietnam text-[13px] font-medium text-lm-500 transition-colors duration-300 hover:bg-[#f1f1f3] hover:text-lm-800"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right pills */}
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={() => openSubscribe()}
            className="relative hidden items-center justify-center overflow-hidden rounded-[50px] bg-[rgba(28,28,17,0.93)] px-[16px] py-[8px] font-bevietnam text-[14px] font-semibold text-white sm:flex"
          >
            <Glow />
            Subscribe
          </button>
          {/* Mobile menu trigger */}
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex size-[34px] items-center justify-center rounded-[50px] border border-lm-400 min-[901px]:hidden"
          >
            <span className="flex flex-col gap-[4px]">
              <span className="h-[1.5px] w-[14px] bg-lm-800" />
              <span className="h-[1.5px] w-[14px] bg-lm-800" />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu — animated sheet with the nav links */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-h-[calc(100dvh-70px)] overflow-y-auto border-t border-lm-200 bg-white min-[901px]:hidden"
          >
            <div className="px-4 pb-8 pt-4">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.label}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                >
                  <a
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="block border-b border-dashed border-lm-200 py-[14px] font-bevietnam text-[17px] font-medium text-lm-800"
                  >
                    {l.label}
                  </a>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
