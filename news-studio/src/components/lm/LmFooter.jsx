import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LmWordmark } from './LmLogo'

// Footer — redesigned top section matching user screenshot: stacked wordmark & tagline,
// email subscribe pill, uppercase column headers with underline dash, chevron links,
// horizontal divider, and right-aligned copyright.
// Giant cropped "dailymattr" wordmark at the bottom (same lockup as the nav).
const pf = { fontVariationSettings: '"opsz" 12, "wdth" 100' }

const PRODUCT_LINKS = [
  { label: 'Home', to: 'https://www.dailymattr.com/' },
  { label: 'What is dailymattr', to: '/#faq' },
  { label: 'Contact Us', href: 'mailto:aitools@dridhatechnologies.com' },
  { label: 'Download APP', to: '/subscribe' },
  { label: 'Subscribe', to: '/subscribe' },
]

function FooterLink({ item }) {
  const cls = 'flex items-center gap-2.5 font-bevietnam text-[14px] sm:text-[15px] font-medium text-[#4A4A52] transition-colors hover:text-black'
  const content = (
    <>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#8E8E98] shrink-0">
        <path d="m9 18 6-6-6-6" />
      </svg>
      <span>{item.label}</span>
    </>
  )
  return item.href ? (
    <a href={item.href} className={cls}>
      {content}
    </a>
  ) : (
    <Link to={item.to} className={cls}>
      {content}
    </Link>
  )
}

export default function LmFooter() {
  return (
    <footer id="footer" className="relative overflow-hidden bg-lm-200">
      <div className="mx-auto flex w-full max-w-[1317px] flex-col px-4 pt-[48px] sm:px-8 sm:pt-[69px]">
        <div className="flex flex-col items-start justify-between gap-12 lg:flex-row lg:gap-16">
          {/* Brand block + subscribe input */}
          <div className="flex w-full max-w-[480px] flex-col gap-6">
            <div className="flex flex-col gap-2 text-lm-800">
              <Link to="/" aria-label="dailymattr home" className="inline-block transition-opacity hover:opacity-80">
                <img
                  alt="dailymattr"
                  src="/news-studio/figma/logo.svg"
                  className="h-[36px] w-auto sm:h-[46px]"
                />
              </Link>
              <p className="font-playfair text-[28px] font-bold leading-tight tracking-[-0.02em] text-lm-800 sm:text-[36px]" style={pf}>
                your deeper read.
              </p>
            </div>

            <p className="max-w-[440px] font-bevietnam text-[15px] leading-[1.6] text-[#6E6E77] sm:text-[16px]">
              dailymattr brings you the story behind the headline — with context, clarity, and perspective that help you understand what really matters.
            </p>

            {/* Email Subscribe Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                window.location.href = '/news-studio/subscribe'
              }}
              className="mt-2 flex w-full max-w-[460px] items-center justify-between gap-2 rounded-full border border-white bg-white/80 p-1.5 shadow-sm backdrop-blur-sm"
            >
              <div className="flex flex-1 items-center gap-3 pl-3 sm:pl-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#8E8E98]">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full bg-transparent font-bevietnam text-[14px] text-lm-800 placeholder:text-[#8E8E98] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="flex shrink-0 items-center gap-2 rounded-full bg-[#141417] px-5 py-2.5 font-bevietnam text-[14px] font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-black sm:px-6"
              >
                <span>Subscribe</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </form>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-14 sm:gap-24 lg:pt-4">
            <div className="flex flex-col gap-5">
              <div>
                <p className="font-bevietnam text-[13px] font-semibold tracking-[0.12em] text-[#6E6E77] uppercase">Product</p>
                <div className="mt-2 h-[2px] w-6 bg-[#A1A1AA]" />
              </div>
              <div className="flex flex-col gap-3.5">
                {PRODUCT_LINKS.map((l) => (
                  <FooterLink key={l.label} item={l} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Divider line */}
        <div className="mt-12 mb-6 w-full border-t border-[#D1D1D8]/80 sm:mt-16 sm:mb-8" />

        {/* Copyright right-aligned */}
        <p className="self-end text-right font-bevietnam text-[14px] font-medium text-[#6E6E77] sm:text-[15px]">
          © 2026 Dridhatechnologies. All rights reserved.
        </p>
      </div>

      {/* Giant wordmark — matching the nav logo artwork */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: 80 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none mt-[40px] block select-none px-4 sm:px-8 lg:mt-[60px]"
      >
        <img
          alt=""
          src="/news-studio/figma/logo.svg"
          className="w-full h-auto max-w-full block"
        />
      </motion.div>
    </footer>
  )
}
