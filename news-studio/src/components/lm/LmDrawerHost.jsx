import React, { useEffect } from 'react'
import { useLmDrawer } from './LmDrawerContext'
import LmAuthDrawer from './LmAuthDrawer'
import LmSubscribeDrawer from './LmSubscribeDrawer'
import { useAuth } from '../../context/AuthContext'
import { getMyPreferences } from '../../lib/newsletterPrefs'
import { LM_CATEGORIES } from './lmCategories'

// Renders the drawers once at the app root; pages just call the context.
// Also hydrates the "Selected" card states from the signed-in user's real
// newsletter_subscriptions so they persist across visits.
export default function LmDrawerHost() {
  const { drawer, close, markSubscribed } = useLmDrawer()
  const { isAuthed } = useAuth()

  useEffect(() => {
    if (!isAuthed) return
    getMyPreferences()
      .then(({ subscriptions }) => {
        const bySlug = (accSlug) => LM_CATEGORIES.filter((c) => c.account?.slug === accSlug).map((c) => c.slug)
        const slugs = (subscriptions || []).flatMap((s) => bySlug(s.category_slug))
        if (slugs.length) markSubscribed(slugs)
      })
      .catch(() => {})
  }, [isAuthed, markSubscribed])

  return (
    <>
      <LmAuthDrawer open={drawer?.type === 'auth'} onClose={close} />
      <LmSubscribeDrawer open={drawer?.type === 'subscribe'} slugs={drawer?.slugs || []} onClose={close} />
    </>
  )
}
