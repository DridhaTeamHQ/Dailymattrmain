import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import LmNav from '../components/lm/LmNav'
import LmFooter from '../components/lm/LmFooter'

// 404 — dailymattr style: dark panel, oversized display type, white pill home CTA.
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white font-bevietnam text-lm-800">
      <LmNav />
      <section className="px-[8px] pt-[82px]">
        <div className="relative mx-auto flex h-[70vh] min-h-[480px] w-full max-w-[1424px] flex-col items-center justify-center overflow-hidden rounded-[24px] bg-[#0d150b] px-6 text-center text-white">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(123,96,67,0.09) 0%, rgba(13,21,11,0.9) 101.88%)' }}
          />
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative font-bold uppercase leading-none tracking-[-0.06em] text-[34vw] sm:text-[22vw] lg:text-[220px]"
          >
            404
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-[560px] pt-[12px] text-[15px] leading-[1.55] sm:text-[18px]"
          >
            This page doesn’t mattr — it moved, or it never existed. The stories worth knowing are still on the front page.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative pt-[40px]"
          >
            <Link
              to="/"
              className="flex h-[50px] items-center justify-center gap-[15px] rounded-[35px] bg-white py-[15px] pl-[24px] pr-[8px]"
            >
              <span className="whitespace-nowrap text-[18px] font-semibold text-[#1b1810]">Back to Home</span>
              <span className="relative size-[34px] rounded-[100px] bg-black">
                <img alt="" src="/news-studio/figma/hero-arrow-up-right.svg" className="absolute left-1/2 top-1/2 size-[20px] -translate-x-1/2 -translate-y-1/2" />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>
      <LmFooter />
    </div>
  )
}
