// Rough reading-time estimate (~200 wpm), min 1 minute.
export function readTime(...texts) {
  const words = texts.filter(Boolean).join(' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
