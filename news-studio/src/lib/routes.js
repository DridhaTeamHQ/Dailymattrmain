// Every story and trending topic has its own page, with URLs in the same
// shape as the /news articles — the headline slug, then the id the page
// resolves on — and built by the same slugify, so links match byte for byte:
//   /news-studio/<headline-slug>-<id>
//   /news-studio/topic/<title-slug>-<id>
// Shared with the server (api/_lib/studio.js), which 301s any other spelling
// of a story URL to this one.
import { slugify } from '../../../api/_lib/slug.js'

export const BASE = '/news-studio'

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const SLUG_ID = new RegExp(`^(?:([a-z0-9-]*)-)?(${UUID})$`)

// "<slug>-<uuid>" -> { slug, id }; null when there is no id at the end
export function parseSlugId(segment) {
  const m = SLUG_ID.exec(String(segment || ''))
  return m ? { slug: m[1] || '', id: m[2] } : null
}

// Router paths (React Router adds BASE). `topic` keeps "Up next" inside that
// topic's timeline when the story was opened from it; it is not part of the
// canonical URL.
export function storyPath(item, { topic } = {}) {
  const path = `/${slugify(item.headline)}-${item.id}`
  return topic ? `${path}?topic=${encodeURIComponent(topic)}` : path
}

export function topicPath(topic) {
  return `/topic/${slugify(topic.title)}-${topic.id}`
}
