import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { siteUrl } from '../lib/siteOrigin'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Google OAuth. `redirectTo` is a PATH ("/real-estate"); it is resolved
  // against the canonical origin so sign-in always lands on www.dailymattr.com
  // (not the vercel.app fallback), except in local dev.
  const signInWithGoogle = useCallback(async (redirectTo) => {
    const path = redirectTo && redirectTo.startsWith('/') ? redirectTo : window.location.pathname
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: siteUrl(path) },
    })
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const value = {
    session,
    user: session?.user ?? null,
    isAuthed: Boolean(session?.user),
    loading,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
