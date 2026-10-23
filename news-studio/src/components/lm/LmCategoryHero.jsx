import React from 'react'
import { motion } from 'framer-motion'
import { useLmDrawer } from './LmDrawerContext'

// Category hero — Figma node 1:5342 (1440x508). Solid black, category photo
// rotated -90deg at 40% opacity, 126px SemiBold title bottom-left, tagline +
// white Subscribe pill bottom-right.
const rb = { fontVariationSettings: '"wdth" 100' }

export default function LmCategoryHero({ title, tagline, image, slug }) {
  const { openSubscribe } = useLmDrawer()
  return (
    <section className="relative overflow-hidden bg-black pt-[70px]">
      {image && (
        <img
          alt=""
          src={image}
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[1440px] w-[508px] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 object-cover opacity-40"
        />
      )}
      <div className="relative mx-auto flex min-h-[340px] w-full max-w-[1358px] flex-col justify-end gap-8 px-4 pb-[clamp(36px,3.9vw,56px)] pt-[64px] sm:px-8 lg:min-h-[clamp(340px,30.4vw,438px)] lg:flex-row lg:items-end lg:justify-between">
        <motion.h1
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="font-bevietnam font-semibold leading-none tracking-[-0.08em] text-white text-[13vw] sm:text-[10vw] lg:text-[clamp(72px,8.75vw,126px)]"
        >
          {title}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full max-w-[433px] flex-col gap-[32px] lg:items-end"
        >
          {tagline && (
            <p className="font-bevietnam text-[16px] leading-[1.46] text-white sm:text-[18px] lg:text-right">{tagline}</p>
          )}
          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={() => openSubscribe(slug ? [slug] : [])}
              className="relative flex items-center justify-center overflow-hidden rounded-[50px] border border-white/10 bg-white px-[24px] py-[16px] font-roboto text-[15px] font-semibold text-lm-800 shadow-[0px_6px_25px_0px_rgba(0,0,0,0.25)]"
              style={rb}
            >
              Subscribe
            </button>
            <button
              type="button"
              onClick={() => openSubscribe(slug ? [slug] : [])}
              aria-label="Get it in your inbox"
              className="relative flex items-center justify-center overflow-hidden rounded-[50px] border border-white/10 bg-white p-[16px] shadow-[0px_6px_25px_0px_rgba(0,0,0,0.25)]"
            >
              <img alt="" src="/news-studio/figma/icon-direct-inbox.svg" className="size-[18px]" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
