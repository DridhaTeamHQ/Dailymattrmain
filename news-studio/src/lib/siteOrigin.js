// Canonical origin for auth redirects. Local dev keeps its own origin; any
// production host (including the vercel.app fallback domain) redirects back
// to the real domain so sign-in never strands users on a preview URL.
// News Studio lives under www.dailymattr.com/news-studio, and callers pass the
// full browser pathname (which already carries the /news-studio prefix).
export const CANONICAL_ORIGIN = 'https://www.dailymattr.com'

export function siteOrigin() {
  const { hostname, origin } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') return origin
  return CANONICAL_ORIGIN
}

// Absolute URL on the canonical origin for a path like "/news-studio/subscribe".
export function siteUrl(path = '/') {
  return siteOrigin() + (path.startsWith('/') ? path : `/${path}`)
}
