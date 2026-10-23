import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import CategoryNewsPage from './CategoryNewsPage'
import { useLmDrawer } from '../components/lm/LmDrawerContext'

// The old /subscribe, /login and /profile PAGES are replaced by the right-side
// drawers (new UX: no navigation). These thin routes keep the URLs working —
// old emails/bookmarks land on the News Studio feed with the right drawer open.

export function SubscribeRoute() {
  const { openSubscribe } = useLmDrawer()
  const [params] = useSearchParams()
  useEffect(() => {
    const cat = params.get('category')
    openSubscribe(cat ? [cat] : [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <CategoryNewsPage />
}

// /login and /profile both open the auth drawer — it lands on Log in when
// signed out and on the Account panel when signed in.
export function AuthRoute() {
  const { openAuth } = useLmDrawer()
  useEffect(() => { openAuth() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <CategoryNewsPage />
}
