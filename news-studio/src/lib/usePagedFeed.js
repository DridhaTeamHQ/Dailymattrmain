import { useCallback, useEffect, useRef, useState } from 'react'

// Paged, near-real-time feed.
//
// Loads the first page on mount, appends older pages on loadMore(), and keeps
// the top fresh by re-polling ONLY the first page every `intervalMs` (and on
// tab focus) — new stories merge in above what's loaded, edited ones update in
// place. Items are merged by id, so a page boundary that shifts as new stories
// land never shows a story twice.
//
// fetchPage(offset) must resolve { items, hasMore }.
// Returns { data, error, loading, loadingMore, hasMore, loadMore }.
export function usePagedFeed(fetchPage, deps = [], { intervalMs = 30000 } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage
  // Bumped on every reset; responses from an older generation are dropped.
  const genRef = useRef(0)
  const offsetRef = useRef(0)
  const busyRef = useRef(false)
  const headSigRef = useRef(null)
  const loadedRef = useRef(false)

  const refreshHead = useCallback(async () => {
    const gen = genRef.current
    try {
      const page = await fetchRef.current(0)
      if (gen !== genRef.current) return
      setError(null)
      let sig
      try { sig = JSON.stringify(page.items) } catch { sig = null }
      if (sig !== null && sig === headSigRef.current) return
      headSigRef.current = sig
      if (!loadedRef.current) {
        loadedRef.current = true
        offsetRef.current = page.items.length
        setHasMore(page.hasMore)
        setData(page.items)
        return
      }
      const fresh = new Set(page.items.map((it) => it.id))
      setData((prev) => [...page.items, ...(prev || []).filter((it) => !fresh.has(it.id))])
    } catch (e) {
      if (gen !== genRef.current) return
      setError(e?.message || 'Could not load. Retrying…')
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (busyRef.current || !loadedRef.current) return
    busyRef.current = true
    setLoadingMore(true)
    const gen = genRef.current
    try {
      const page = await fetchRef.current(offsetRef.current)
      if (gen !== genRef.current) return
      offsetRef.current += page.items.length
      setHasMore(page.hasMore)
      setData((prev) => {
        const seen = new Set((prev || []).map((it) => it.id))
        return [...(prev || []), ...page.items.filter((it) => !seen.has(it.id))]
      })
    } catch (e) {
      if (gen === genRef.current) setError(e?.message || 'Could not load more.')
    } finally {
      if (gen === genRef.current) {
        busyRef.current = false
        setLoadingMore(false)
      }
    }
  }, [])

  useEffect(() => {
    // Reset on dependency change (category, section, search) so the page shows
    // a fresh load instead of the previous selection's stale stories.
    genRef.current += 1
    offsetRef.current = 0
    busyRef.current = false
    headSigRef.current = null
    loadedRef.current = false
    setData(null)
    setError(null)
    setHasMore(false)
    setLoadingMore(false)

    refreshHead()
    const timer = setInterval(refreshHead, intervalMs)
    const onVisible = () => { if (document.visibilityState === 'visible') refreshHead() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refreshHead)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refreshHead)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading: data === null && !error, loadingMore, hasMore, loadMore }
}

// Infinite-scroll trigger: attach the returned ref to an element at the end of
// the list; `onMore` fires whenever it comes within ~a screen of the viewport.
// The observer is rebuilt when `count` changes, so if a freshly loaded page
// still leaves the sentinel on screen (e.g. a filter hides most of it), the
// next page loads too.
export function useInfiniteSentinel(onMore, enabled, count) {
  const ref = useRef(null)
  const onMoreRef = useRef(onMore)
  onMoreRef.current = onMore
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) onMoreRef.current?.() },
      { rootMargin: '900px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [enabled, count])
  return ref
}
