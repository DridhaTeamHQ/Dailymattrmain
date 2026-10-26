// SEO text for News Studio pages, following the /news article rules
// (api/_lib/seo.js): the title and H1 are the cleaned headline, the meta
// description is the story text cut at a word near 155 characters. The server
// render (api/_lib/studio.js) and the in-app navigation (applyHead) both use
// these, so a page reads the same however it was reached.
import { cleanHeadline } from '../../../api/_lib/slug.js'
import { BASE, storyPath, topicPath } from './routes.js'

export const ORIGIN = 'https://www.dailymattr.com'

// brand suffix on the <title> tag only, as on /news (api/_lib/router.js) —
// og:title, twitter:title, JSON-LD and the H1 keep the bare headline
const withBrand = (title) => `${title} | dailymattr`

export const FEED_SEO = {
  title: 'dailymattr | News Studio',
  description:
    "The day's biggest stories across India, world, business, sports and tech — summarised, fact-checked and grouped by day on dailymattr News Studio.",
  path: `${BASE}/`,
}

// same as api/_lib/text.js truncateAtWord (that module reads server env, so
// it can't be bundled for the browser)
export function truncateAtWord(s, max) {
  s = String(s || '').replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' '))
  return (end > max * 0.6 ? cut.slice(0, end) : cut).replace(/[\s,;:\-–—]+$/, '') + '…'
}

export function storySeo(item) {
  const title = cleanHeadline(item.headline)
  return {
    title,
    pageTitle: withBrand(title),
    description: truncateAtWord(cleanHeadline(item.summary || item.body), 155),
    path: BASE + storyPath(item),
  }
}

export function topicSeo(topic) {
  const title = cleanHeadline(topic.title)
  return {
    title,
    pageTitle: withBrand(title),
    description: truncateAtWord(
      cleanHeadline(topic.description) || `${title}: every report on this story, in order, from the outlets covering it.`,
      155,
    ),
    path: BASE + topicPath(topic),
  }
}

// Browser side: keep the head in step on in-app navigation. The first load
// already arrives with these tags rendered by the server.
export function applyHead({ title, pageTitle = title, description, path }) {
  document.title = pageTitle
  const url = ORIGIN + path
  const set = (selector, attr, value) => {
    const el = document.head.querySelector(selector)
    if (el) el.setAttribute(attr, value)
  }
  set('meta[name="description"]', 'content', description)
  set('link[rel="canonical"]', 'href', url)
  set('meta[property="og:title"]', 'content', title)
  set('meta[property="og:description"]', 'content', description)
  set('meta[property="og:url"]', 'content', url)
  set('meta[name="twitter:title"]', 'content', title)
  set('meta[name="twitter:description"]', 'content', description)
}
