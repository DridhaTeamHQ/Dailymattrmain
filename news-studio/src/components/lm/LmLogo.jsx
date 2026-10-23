import React from 'react'
import { Link } from 'react-router-dom'

// The brand wordmark: "dailymattr" — lowercase Playfair in brand blue, wrapped
// in raised quote marks (Figma "Dailymattr — Landing page", blue #3979FF, the
// same blue as the News Studio filter pill).
//
// Everything inside is sized in `em`, so ONE font-size on the wrapper scales
// the whole lockup — the nav uses 30px, the footer brand block ~52px, and the
// giant footer crop uses a vw size. Colour is a wrapper class too, so a dark
// surface can pass a lighter blue.
const pf = { fontVariationSettings: '"opsz" 12, "wdth" 100' }

export function LmWordmark({ className = '' }) {
  return (
    <img
      alt="dailymattr"
      src="/news-studio/figma/logo.svg"
      className={`inline-block h-[1em] w-auto ${className}`}
    />
  )
}

// Nav lockup — the exported Figma artwork rather than the live-text wordmark,
// so the nav shows the mark exactly as designed. The SVG is baked in brand
// blue (#3979FF); on near-black surfaces it steps up a touch so it doesn't
// read dim against the dark bar.
const LOGO = '/news-studio/figma/logo.svg'

export default function LmLogo({ className = '', to = '/', tone = 'light' }) {
  return (
    <Link
      to={to}
      aria-label="dailymattr home"
      className={`inline-block select-none leading-none transition-opacity hover:opacity-80 ${className}`}
    >
      <img
        alt="dailymattr"
        src={LOGO}
        width="156"
        height="32"
        className={`block h-[26px] w-auto max-w-none sm:h-[32px] ${tone === 'dark' ? 'brightness-125' : ''}`}
      />
    </Link>
  )
}
