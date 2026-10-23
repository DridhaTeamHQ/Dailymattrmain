import React from 'react'
import { motion } from 'framer-motion'

// Scroll-reveal wrapper — fades + rises content as it enters the viewport.
// Use `delay` (s) to stagger siblings; `y` to tune travel distance.
export default function Reveal({ children, delay = 0, y = 28, once = true, className = '', ...rest }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
