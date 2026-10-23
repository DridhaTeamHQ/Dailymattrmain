import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LmNav from '../components/lm/LmNav'
import LmHero from '../components/lm/LmHero'
import LmDailyWeekly from '../components/lm/LmDailyWeekly'
import LmCategoryGrid from '../components/lm/LmCategoryGrid'
import LmFaq from '../components/lm/LmFaq'
import LmFooter from '../components/lm/LmFooter'
import { LM_CATEGORIES } from '../components/lm/lmCategories'
import { useLmDrawer } from '../components/lm/LmDrawerContext'

// Landing — dailymattr design (Figma R0PWgZZF2fEQt7bn6V6KPx, frame 1:59):
// nav -> hero (video panel + dailymattr) -> Top selection banner -> The Daily/The Weekly strip ->
// category grid -> FAQ -> footer with giant wordmark.
const NewsletterPage = () => {
  const { openSubscribe } = useLmDrawer()
  const [selectedSlugs, setSelectedSlugs] = useState([])

  const handleToggle = (cat) => {
    setSelectedSlugs((prev) =>
      prev.includes(cat.slug) ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug]
    )
  }

  return (
    <div className={`min-h-screen bg-white font-bevietnam text-lm-800 transition-all duration-300 ${selectedSlugs.length > 0 ? 'pb-[110px]' : ''}`}>
      <LmNav />
      <LmHero />

      <LmDailyWeekly />
      <LmCategoryGrid selectedSlugs={selectedSlugs} onToggle={handleToggle} />
      <LmFaq />
      <LmFooter />

      {/* Fixed bottom selection bar — moves with scroll without backshadow */}
      <AnimatePresence>
        {selectedSlugs.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[#141417] text-white"
          >
            <div className="mx-auto flex max-w-[1424px] flex-col items-start justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center sm:px-12 lg:px-16">
              {/* Left side: count and category chips */}
              <div className="flex w-full flex-col gap-3 sm:w-auto">
                <p className="font-bevietnam text-[20px] font-medium text-white sm:text-[24px]">
                  {selectedSlugs.length} {selectedSlugs.length === 1 ? 'Category selected' : 'Categories selected'}
                </p>
                <div className="flex max-h-[100px] flex-wrap gap-2.5 overflow-y-auto scrollbar-none">
                  {selectedSlugs.map((slug) => {
                    const cat = LM_CATEGORIES.find((c) => c.slug === slug)
                    if (!cat) return null
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => setSelectedSlugs((prev) => prev.filter((s) => s !== slug))}
                        className="flex items-center gap-2 rounded-full border border-[#3F3F46] bg-[#27272A] px-4 py-1.5 font-bevietnam text-[13px] font-medium text-white transition-colors hover:bg-[#3F3F46]"
                      >
                        <span>{cat.title}</span>
                        <span className="text-[14px] text-[#A1A1AA] hover:text-white">×</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right side: Set up edition button */}
              <button
                type="button"
                onClick={() => openSubscribe(selectedSlugs)}
                className="flex w-full shrink-0 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 font-bevietnam text-[15px] font-semibold text-black shadow-md transition-transform duration-200 hover:scale-[1.03] hover:bg-white/90 sm:w-auto"
              >
                <span>Set up edition</span>
                <span className="flex size-[28px] items-center justify-center rounded-full bg-[#141417] text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NewsletterPage
