import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Floating "back to top" — desktop only (the mobile reading view has its own
// bottom toolbar, so we keep the thumb zone clear on phones).
export default function ScrollTopButton() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 right-6 z-30 hidden h-11 w-11 items-center justify-center rounded-full border border-lm-300 bg-white/80 text-lm-800 shadow-[0_8px_24px_rgba(17,24,39,0.14)] backdrop-blur-md transition-colors hover:bg-white lg:flex"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
