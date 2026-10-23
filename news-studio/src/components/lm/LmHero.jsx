import React from 'react'
import { motion } from 'framer-motion'
import { useLmDrawer } from './LmDrawerContext'

// Hero — Figma nodes 1:60 (media, 1424x738 rounded 24) + 1:64 (copy overlay).
// Dark media panel (video slot with poster fallback) + gradient, centered
// "dailymattr" display headline, subcopy, white Subscribe pill CTA.
export default function LmHero() {
  const { openSubscribe } = useLmDrawer()
  return (
    <section className="px-[8px] pt-[82px]">
      <div className="relative mx-auto h-[560px] w-full max-w-[1424px] overflow-hidden rounded-[24px] bg-[#0d150b] sm:h-[640px] lg:h-[clamp(560px,51.3vw,738px)]">
        {/* Media slot — the poster always paints; the video layers in only once a
            real clip exists at /figma/hero-video.mp4 (missing file = removed). */}
        <img
          alt=""
          src="/news-studio/figma/hero-video-poster.png"
          className="absolute left-1/2 top-1/2 h-[105%] w-[105%] -translate-x-1/2 -translate-y-1/2 object-cover"
        />
        <video
          className="absolute left-1/2 top-1/2 h-[105%] w-[105%] -translate-x-1/2 -translate-y-1/2 object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          src="/news-studio/figma/hero-video.mp4"
          onError={(e) => e.currentTarget.remove()}
        />
        {/* Gradient overlay */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[25px]"
          style={{ background: 'linear-gradient(to bottom, rgba(123,96,67,0.09) 0%, rgba(13,21,11,0.9) 101.88%)' }}
        />

        {/* Copy overlay — staged entrance on load */}
        <div className="absolute inset-x-4 top-[27%] flex flex-col items-center gap-[32px] text-center text-white lg:top-[37.8%] lg:gap-[clamp(36px,3.9vw,56px)]">
          <div className="flex w-full flex-col items-center gap-[12px]">
            <motion.h1
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="whitespace-nowrap font-bevietnam font-bold leading-[1.2] tracking-[-0.08em] text-[15vw] sm:text-[13vw] lg:text-[clamp(110px,11.5vw,166px)]"
            >
              dailymattr
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-[720px] font-bevietnam text-[15px] leading-[1.55] sm:text-[18px]"
            >
              Get the stories worth knowing, shaped around the topics you follow. From markets and{' '}
              <br className="hidden sm:block" aria-hidden />
              AI to sports, culture and everything in between.
            </motion.p>
          </div>
          <motion.button
            type="button"
            onClick={() => openSubscribe([])}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex h-[50px] items-center justify-center gap-[15px] rounded-[35px] bg-white py-[15px] pl-[24px] pr-[8px]"
          >
            <span className="whitespace-nowrap font-bevietnam text-[18px] font-semibold text-[#1b1810]">Subscribe</span>
            <span className="relative size-[34px] rounded-[100px] bg-black">
              <img alt="" src="/news-studio/figma/hero-arrow-up-right.svg" className="absolute left-1/2 top-1/2 size-[20px] -translate-x-1/2 -translate-y-1/2" />
            </span>
          </motion.button>
        </div>
      </div>
    </section>
  )
}
