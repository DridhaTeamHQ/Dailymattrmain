import React, { useEffect, useMemo, useState } from 'react'
import LmDrawer from './LmDrawer'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { getMyPreferences, unsubscribe, updateProfileName } from '../../lib/newsletterPrefs'
import { siteUrl } from '../../lib/siteOrigin'
import { LM_CATEGORIES } from './lmCategories'
import { useLmDrawer } from './LmDrawerContext'

// Auth / account drawer — Figma overlays 05-10 (564px, bg #F4F4F6, centered
// Playfair wordmark; account states white with avatar header + pill tabs).
const rb = { fontVariationSettings: '"wdth" 100' }

function Wordmark() {
  return (
    <p className="pt-[40px] text-center leading-none text-lm-800">
      <img src="/assets/publisher-logo.png" width="156" height="32" alt="dailymattr" className="mx-auto block h-[32px] w-[156px]" />
    </p>
  )
}

const inputCls =
  'w-full rounded-[60px] border border-lm-200 bg-white px-[20px] py-[13px] font-roboto text-[15px] text-lm-800 outline-none placeholder:text-lm-400 focus:border-lm-700'

export default function LmAuthDrawer({ open, onClose }) {
  const { isAuthed, user, signInWithGoogle, signOut } = useAuth()
  const [view, setView] = useState('login') // login | email | signup | success | account
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [wasAuthed, setWasAuthed] = useState(isAuthed)

  // Opening: land on the right view for the session state.
  useEffect(() => {
    if (open) {
      setView(isAuthed ? 'account' : 'login')
      setNotice('')
      setWasAuthed(isAuthed)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Session appears while the drawer is open (magic link / OAuth return) → success.
  useEffect(() => {
    if (open && isAuthed && !wasAuthed) { setView('success'); setWasAuthed(true) }
  }, [isAuthed, open, wasAuthed])

  const sendMagicLink = async (opts = {}) => {
    if (!email.trim()) { setNotice('Enter your email address first.'); return }
    setBusy(true)
    setNotice('')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: siteUrl(window.location.pathname),
          data: opts.signup ? { full_name: name.trim() || undefined, mobile: mobile.trim() || undefined } : undefined,
        },
      })
      if (error) throw error
      setNotice('Check your inbox — we sent you a sign-in link.')
    } catch (e) {
      setNotice(e.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    setBusy(true)
    try { await signInWithGoogle(window.location.pathname) } finally { setBusy(false) }
  }

  const isAccount = view === 'account'
  return (
    <LmDrawer open={open} onClose={onClose} width={564} scrim={0.5}>
      <div className={`flex min-h-full flex-col ${isAccount ? 'bg-white' : 'bg-[#F4F4F6]'}`}>
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-[20px] top-[20px] z-10 flex size-[32px] items-center justify-center rounded-full text-[20px] leading-none text-lm-500 hover:bg-black/5">
          ×
        </button>

        {!isAccount && <Wordmark />}

        {view === 'login' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-[20px] px-5 pb-24 sm:px-8">
            <p className="font-bevietnam text-[18px] font-medium text-lm-800">Log in to dailymattr</p>
            <button type="button" disabled={busy} onClick={google} className="w-full max-w-[283px] rounded-[60px] bg-[#5673E5] py-[14px] text-center font-bevietnam text-[14px] font-medium text-white hover:brightness-105">
              Continue with Google
            </button>
            <button type="button" onClick={() => setView('email')} className="w-full max-w-[283px] rounded-[60px] border border-lm-200 bg-white py-[14px] text-center font-bevietnam text-[14px] font-medium text-lm-800 hover:border-lm-400">
              Continue with email
            </button>
            <p className="font-bevietnam text-[13px] text-lm-500">
              Don’t have an account?{' '}
              <button type="button" onClick={() => setView('signup')} className="font-semibold text-lm-800 underline">Sign up</button>
            </p>
          </div>
        )}

        {view === 'email' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-[20px] px-5 pb-24 sm:px-8">
            <p className="font-roboto text-[18px] font-medium text-lm-800" style={rb}>What’s your email address?</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              className={`${inputCls} max-w-[337px]`}
            />
            <button type="button" disabled={busy} onClick={() => sendMagicLink()} className="w-full max-w-[337px] rounded-[60px] bg-lm-700 py-[14px] text-center font-roboto text-[15px] font-semibold text-white shadow-[0px_6px_25px_0px_rgba(0,0,0,0.25)]" style={rb}>
              Continue with email
            </button>
            {notice && <p className="max-w-[337px] text-center font-bevietnam text-[13px] text-lm-500">{notice}</p>}
            <p className="font-bevietnam text-[13px] text-lm-500">
              Don’t have an account?{' '}
              <button type="button" onClick={() => setView('signup')} className="font-semibold text-lm-800 underline">Sign up</button>
            </p>
          </div>
        )}

        {view === 'signup' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-[16px] px-5 pb-24 sm:px-8">
            <p className="font-bevietnam text-[18px] font-medium text-lm-800">Create an account</p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address..." className={`${inputCls} max-w-[337px]`} />
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className={`${inputCls} max-w-[337px]`} />
            <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Enter your mobile number" className={`${inputCls} max-w-[337px]`} />
            <p className="max-w-[337px] text-center font-roboto text-[13px] text-lm-500" style={rb}>
              By creating an account, you agree to our <a href="#faq" className="underline">terms &amp; conditions</a> and <a href="#faq" className="underline">Privacy Policy</a>
            </p>
            <button type="button" disabled={busy} onClick={() => sendMagicLink({ signup: true })} className="w-full max-w-[337px] rounded-[60px] bg-lm-700 py-[14px] text-center font-roboto text-[15px] font-semibold text-white shadow-[0px_6px_25px_0px_rgba(0,0,0,0.25)]" style={rb}>
              Create account
            </button>
            {notice && <p className="max-w-[337px] text-center font-bevietnam text-[13px] text-lm-500">{notice}</p>}
            <p className="font-bevietnam text-[13px] text-lm-500">
              Already have an account?{' '}
              <button type="button" onClick={() => setView('login')} className="font-semibold text-lm-800 underline">Login</button>
            </p>
            <button type="button" disabled={busy} onClick={google} className="w-full max-w-[337px] rounded-[60px] bg-[#5673E5] py-[14px] text-center font-bevietnam text-[14px] font-medium text-white hover:brightness-105">
              Continue with Google
            </button>
          </div>
        )}

        {view === 'success' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-[16px] px-5 pb-24 sm:px-8 text-center">
            <img alt="" src="/news-studio/figma/icon-tick-circle-success-96.svg" className="size-[64px]" />
            <p className="font-bevietnam text-[18px] font-semibold text-lm-800">Account created successfully</p>
            <p className="max-w-[320px] font-bevietnam text-[14px] leading-[1.5] text-lm-500">
              Your dailymattr account is ready. You can now build your edition, subscribe to newsletters, and manage preferences anytime.
            </p>
            <button type="button" onClick={() => setView('account')} className="rounded-[60px] bg-lm-700 px-[24px] py-[10px] font-roboto text-[14px] font-semibold text-white" style={rb}>
              Continue
            </button>
          </div>
        )}

        {view === 'account' && <AccountPanel user={user} onSignOut={async () => { await signOut(); onClose() }} />}
      </div>
    </LmDrawer>
  )
}

function AccountPanel({ user, onSignOut }) {
  const { openSubscribe } = useLmDrawer()
  const [tab, setTab] = useState('general')
  const meta = user?.user_metadata || {}
  const [name, setName] = useState(meta.full_name || meta.name || '')
  const [mobile, setMobile] = useState(meta.mobile || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [subs, setSubs] = useState(null)

  const initials = useMemo(() => {
    const n = name || user?.email || '?'
    return n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  }, [name, user])

  useEffect(() => {
    if (tab !== 'editions' || subs) return
    getMyPreferences()
      .then((p) => setSubs(p?.subscriptions || []))
      .catch(() => setSubs([]))
  }, [tab, subs])

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await updateProfileName(name.trim())
      await supabase.auth.updateUser({ data: { full_name: name.trim(), mobile: mobile.trim() } })
      setSaved(true)
    } catch { /* keep editing */ } finally { setSaving(false) }
  }

  const fieldCls = 'w-full rounded-[14px] border border-lm-200 bg-white px-[16px] py-[12px] font-roboto text-[15px] text-lm-800 outline-none focus:border-lm-700'
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-lm-200 px-[24px] pb-[16px] pt-[24px]">
        <div className="flex items-center gap-[12px]">
          <span className="flex size-[48px] items-center justify-center rounded-full bg-lm-200 font-bevietnam text-[15px] font-semibold text-lm-600">{initials}</span>
          <div>
            <p className="font-bevietnam text-[16px] font-semibold text-lm-800">{name || 'Your account'}</p>
            <p className="font-bevietnam text-[13px] text-lm-500">{user?.email}</p>
          </div>
        </div>
        <div className="mt-[16px] flex items-center gap-[8px]">
          <button type="button" onClick={() => setTab('general')} className={`rounded-[100px] px-[12px] py-[8px] font-bevietnam text-[13px] font-medium ${tab === 'general' ? 'bg-lm-800 text-white' : 'border border-lm-300 text-lm-500'}`}>
            General
          </button>
          <button type="button" onClick={() => setTab('editions')} className={`rounded-[100px] px-[12px] py-[8px] font-bevietnam text-[13px] font-medium ${tab === 'editions' ? 'bg-lm-800 text-white' : 'border border-lm-300 text-lm-500'}`}>
            My Editions
          </button>
        </div>
      </div>

      {tab === 'general' ? (
        <div className="flex flex-col gap-[16px] px-[24px] py-[20px]">
          <label className="flex flex-col gap-[6px]">
            <span className="font-bevietnam text-[13px] text-lm-600">User Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
          </label>
          <label className="flex flex-col gap-[6px]">
            <span className="font-bevietnam text-[13px] text-lm-600">Email</span>
            <input value={user?.email || ''} readOnly className={`${fieldCls} text-lm-500`} />
          </label>
          <label className="flex flex-col gap-[6px]">
            <span className="font-bevietnam text-[13px] text-lm-600">Mobile number</span>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} className={fieldCls} />
          </label>
          <div className="flex items-center justify-between pt-[8px]">
            <button type="button" onClick={onSignOut} className="font-bevietnam text-[13px] font-medium text-lm-500 underline">Sign out</button>
            <button type="button" disabled={saving} onClick={save} className="rounded-[60px] bg-lm-800 px-[20px] py-[10px] font-roboto text-[14px] font-semibold text-white" style={rb}>
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px] px-[24px] py-[20px]">
          {!subs && <p className="font-bevietnam text-[14px] text-lm-500">Loading your editions…</p>}
          {subs && subs.length === 0 && <p className="font-bevietnam text-[14px] text-lm-500">No editions yet — subscribe to a category to get started.</p>}
          {subs && subs.map((s) => {
            const lm = LM_CATEGORIES.find((c) => c.account?.slug === s.category_slug)
            const label = lm?.title || (s.category_slug || '').split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ')
            const day = s.weekday ? s.weekday[0].toUpperCase() + s.weekday.slice(1) : null
            return (
              <div key={s.id} className="flex items-center justify-between rounded-[16px] border border-lm-200 bg-white px-[16px] py-[12px]">
                <div>
                  <p className="font-bevietnam text-[15px] font-semibold text-lm-800">{label}</p>
                  <p className="font-bevietnam text-[12px] text-[#2563EB]">{day ? `Weekly · ${day}` : 'Daily'}</p>
                </div>
                <div className="flex items-center gap-[6px]">
                  {lm && (
                    <button
                      type="button"
                      onClick={() => openSubscribe([lm.slug])}
                      className="rounded-[100px] bg-lm-800 px-[12px] py-[6px] font-bevietnam text-[12px] font-medium text-white hover:bg-black"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => { await unsubscribe(s.category_slug).catch(() => {}); setSubs((x) => x.filter((y) => y.id !== s.id)) }}
                    className="rounded-[100px] border border-lm-300 px-[12px] py-[6px] font-bevietnam text-[12px] font-medium text-lm-500 hover:border-lm-700 hover:text-lm-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
