import { useCallback, useEffect, useRef, useState } from 'react'

// Near-real-time data without touching the backend.
//
// Polls: fetch on mount, refetch every `intervalMs`, and refetch immediately on
// tab focus/visibility. State updates only when the payload changes. Failures are
// surfaced (not swallowed) so the UI can show an error + retry instead of a
// silent, endless skeleton — and the next poll auto-retries regardless.
//
// Returns { data, error, loading, reload }.
export function useLiveData(fetcher, deps = [], { intervalMs = 8000 } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const sigRef = useRef(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const aliveRef = useRef(true)

  const load = useCallback(async () => {
    try {
      const next = await fetcherRef.current()
      if (!aliveRef.current) return
      setError(null)
      let sig
      try { sig = JSON.stringify(next) } catch { sig = null }
      if (sig === null || sig !== sigRef.current) {
        sigRef.current = sig
        setData(next)
      }
    } catch (e) {
      if (!aliveRef.current) return
      setError(e?.message || 'Could not load. Retrying…')
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    // Reset on dependency change (e.g. switching category) so the page shows a
    // fresh load instead of flashing the previous selection's stale data.
    sigRef.current = null
    setData(null)
    setError(null)

    load()
    const timer = setInterval(load, intervalMs)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', load)

    return () => {
      aliveRef.current = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', load)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading: data === null && !error, reload: load }
}
