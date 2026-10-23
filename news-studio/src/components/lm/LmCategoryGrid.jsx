import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LM_CATEGORIES } from './lmCategories'
import { useLmDrawer } from './LmDrawerContext'
import Reveal from './Reveal'

// Categories — Figma node 1:282 (1440x2389). Header row (eyebrow with black
// marker highlight + 56px H2 left, right-aligned blurb) above a 3x3 grid of
// pastel cards: image (263px), 32px title, 18px description, pill button.
// Multi-select enabled: clicking cards selects them, showing a bottom banner to set up edition.
const rb = { fontVariationSettings: '"wdth" 100' }
const GLOW = '/news-studio/figma/cat-button-glow.svg'

function CardButton({ selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center justify-center gap-[8px] overflow-hidden rounded-[50px] px-[24px] py-[16px] font-roboto text-[15px] font-semibold transition-all duration-200 ${
        selected
          ? 'bg-[#141417] text-white shadow-[0px_6px_25px_0px_rgba(0,0,0,0.2)] scale-[1.02]'
          : 'border border-solid border-black/10 bg-white text-lm-800 hover:border-black/30'
      }`}
      style={rb}
    >
      <span aria-hidden className="pointer-events-none absolute left-[-70px] top-[63px] h-[8px] w-[251px]">
        <img alt="" src={GLOW} className="block size-full max-w-none" />
      </span>
      {selected ? (
        <img alt="" src="/news-studio/figma/cat-icon-tick.svg" className="size-[20px]" />
      ) : (
        <img alt="" src="/news-studio/figma/cat-icon-add.svg" className="size-[16px]" />
      )}
      {selected ? 'Selected' : 'Subscribe'}
    </button>
  )
}

export default function LmCategoryGrid({ selectedSlugs = [], onToggle }) {
  const { openSubscribe, subscribedSlugs } = useLmDrawer()
  const [localSelected, setLocalSelected] = useState([])

  const activeSlugs = onToggle ? selectedSlugs : localSelected
  const handleToggle = (cat) => {
    if (onToggle) {
      onToggle(cat)
    } else {
      setLocalSelected((prev) =>
        prev.includes(cat.slug) ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug]
      )
    }
  }

  const isOn = (slug) => activeSlugs.includes(slug) || subscribedSlugs.includes(slug)

  return (
    <section id="categories" className="bg-white">
      {/* 1329 content + 64 gutters — px stays on at every width */}
      <div className="mx-auto w-full max-w-[1393px] px-4 pt-[48px] sm:px-8 sm:pt-[71px]">
        {/* Header row */}
        <Reveal className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="flex max-w-[611px] flex-col gap-[24px]">
            <p className="font-bevietnam text-[15px] font-semibold leading-[1.26] tracking-[2.7px] text-black sm:text-[18px]">
              EXPLORE <span className="bg-black px-[2px] text-white">CATEGORIES</span>
            </p>
            <h2 className="font-bevietnam text-[40px] font-medium leading-[1.26] tracking-[0.05em] text-lm-800 sm:text-[clamp(40px,3.9vw,56px)]">
              Choose the categories<br className="hidden sm:block" /> that matter to you
            </h2>
          </div>
          <p className="max-w-[539px] font-bevietnam text-[18px] font-medium leading-[1.46] text-lm-800 lg:text-right">
            From markets and technology to sports and culture, personalize your newsletter with the topics you care about.
          </p>
        </Reveal>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-[16px] pb-[56px] pt-[36px] sm:grid-cols-2 sm:gap-[24px] sm:pb-[80px] sm:pt-[64px] lg:grid-cols-3 lg:pt-[74px]">
          {LM_CATEGORIES.map((cat) => {
            const isSelected = isOn(cat.slug)
            const to = `/${cat.slug}`
            return (
              <motion.article
                key={cat.slug}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: (LM_CATEGORIES.indexOf(cat) % 3) * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
                className="flex flex-col gap-[12px] overflow-hidden rounded-[24px]"
                style={{ backgroundColor: cat.bg }}
              >
                <Link to={to} className="block h-[220px] w-full overflow-hidden lg:h-[clamp(200px,18.3vw,263px)]">
                  <img
                    alt={cat.title}
                    src={cat.image}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                  />
                </Link>
                <div className="flex flex-1 flex-col gap-[32px] p-[16px]">
                  <div className="flex flex-col gap-[8px] leading-[1.46]">
                    <Link to={to} className="font-bevietnam text-[26px] font-medium tracking-[-1.6px] text-black hover:underline sm:text-[32px]">
                      {cat.title}
                    </Link>
                    <p className="font-bevietnam text-[18px] text-lm-800">{cat.desc}</p>
                  </div>
                  <div className="mt-auto">
                    <CardButton selected={isSelected} onClick={() => handleToggle(cat)} />
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
