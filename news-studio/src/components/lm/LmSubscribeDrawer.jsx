import React, { useEffect, useMemo, useState } from 'react'
import LmDrawer from './LmDrawer'
import { LM_CATEGORIES, lmCategoryBySlug } from './lmCategories'
import { subscribeNewsletter } from '../../lib/subscribeApi'
import { subscribe as accountSubscribe, ensureProfile, getMyPreferences } from '../../lib/newsletterPrefs'
import { SOURCE_PREFERENCES } from '../../lib/subscribeOptions'
import { useAuth } from '../../context/AuthContext'
import { useLmDrawer } from './LmDrawerContext'

// Subscribe drawer — Figma overlays 01-04 ("Setup your edition", 589px,
// bg #F4F4F6, white header/footer bars).
//
// TWO WRITE PATHS (mirrors the old site):
// - Signed-in users → newsletter_subscriptions via newsletterPrefs.subscribe
//   (shows in My Editions; reaches the account audience of send-newsletter).
// - Guests → legacy `subscribers` table via the subscribers edge function.
//
// EDITION RULES:
// 1. General (the daily wrap) is DAILY-ONLY.
// 2. Every other category offers Daily OR Weekly. Daily = that topic's case
//    study each morning; Weekly = the topic's short articles on the chosen day.
// 3. For the 4 topic categories, each weekday carries AT MOST ONE weekly
//    edition (existing editions block their day — the old "blocked" map).
// 4. Source preference (top / mixed / wide) applies to the General edition.
const rb = { fontVariationSettings: '"wdth" 100' }
// The agent sends Mon–Sat; Sunday is deliberately excluded.
const DAYS = [
  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'],
]
const FULL_DAY = { mon: 'monday', tue: 'tuesday', wed: 'wednesday', thu: 'thursday', fri: 'friday', sat: 'saturday' }
const SHORT_DAY = Object.fromEntries(Object.entries(FULL_DAY).map(([s, f]) => [f, s]))
const dayLabel = (id) => (DAYS.find(([d]) => d === id) || [])[1] || ''
// Guest (legacy) categories: the subscribers edge function accepts our slugs directly.
const REAL_CATEGORY = (slug) => slug
const isDailyOnly = (t) => t.slug === 'general' // General: daily mails only
const isSmallArticle = (t) => t.account?.type === 'category_small_articles' // one-per-weekday rule

const getDayName = (dayId) => {
  if (!dayId || !FULL_DAY[dayId]) return 'your chosen day'
  const name = FULL_DAY[dayId]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

const getDeliveryMessage = (t, c) => {
  if (isDailyOnly(t)) {
    return 'You will receive 10 key headlines every day'
  }
  const rhythm = c?.rhythm
  if (!rhythm) return null
  const dayStr = getDayName(c.day)
  if (rhythm === 'daily') {
    return `You will receive 1 detailed ${t.title} story every day`
  }
  if (rhythm === 'weekly') {
    return `You will receive 5 key ${t.title} headlines once a week on ${dayStr}`
  }
  if (rhythm === 'both') {
    return `You will receive 1 detailed ${t.title} story every day + 5 key headlines once a week on ${dayStr}`
  }
  return null
}

function OptionRow({ label, hint, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[16px] border px-[16px] py-[11px] text-left ${selected ? 'border-lm-700 bg-[#F4F4F6]' : 'border-lm-200 bg-white'
        }`}
    >
      <span>
        <span className="block font-bevietnam text-[15px] font-semibold text-lm-800">{label}</span>
        {hint && <span className="block font-bevietnam text-[12px] text-lm-500">{hint}</span>}
      </span>
      <img
        alt=""
        src={selected ? '/news-studio/figma/icon-tick-circle-selected-dark.svg' : '/news-studio/figma/icon-tick-circle-unselected.svg'}
        className="size-[20px] shrink-0"
      />
    </button>
  )
}

export default function LmSubscribeDrawer({ open, slugs = [], onClose }) {
  const { user } = useAuth()
  const { markSubscribed } = useLmDrawer()
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState([])
  // choices: slug -> { rhythm: 'daily'|'weekly', day: 'fri' }
  const [choices, setChoices] = useState({})
  // Weekdays reserved by the user's EXISTING topic editions: day -> account slug.
  const [takenDays, setTakenDays] = useState({})
  const [sourcePref, setSourcePref] = useState('top')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [consent, setConsent] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // ---- weekday ownership (topic categories only) ---------------------------
  const dayOwner = (dayId, topic, currChoices, selList) => {
    if (isDailyOnly(topic)) return null
    for (const other of LM_CATEGORIES) {
      if (other.slug === topic.slug || isDailyOnly(other)) continue
      const r = currChoices[other.slug]?.rhythm
      if (selList.includes(other.slug) && (r === 'weekly' || r === 'both') && currChoices[other.slug]?.day === dayId) {
        return other.title
      }
    }
    const acc = takenDays[dayId]
    if (acc && acc !== topic.account?.slug) {
      const owner = LM_CATEGORIES.find((c) => c.account?.slug === acc)
      return owner?.title || 'another edition'
    }
    return null
  }
  const freeDayFor = (topic, currChoices, selList) =>
    DAYS.map(([id]) => id).find((id) => !dayOwner(id, topic, currChoices, selList))

  // ---- open: seed selection + load existing editions ----------------------
  useEffect(() => {
    if (!open) return
    const seeded = slugs.filter((s) => lmCategoryBySlug(s))
    setSelected(seeded)
    setChoices((c) => {
      const next = { ...c }
      for (const s of seeded) if (!next[s]?.rhythm) next[s] = { rhythm: 'daily' }
      return next
    })
    setStep(1)
    setError('')
    if (user) {
      getMyPreferences()
        .then(({ subscriptions, blocked }) => {
          const taken = {}
          for (const [full, acc] of Object.entries(blocked || {})) {
            if (SHORT_DAY[full]) taken[SHORT_DAY[full]] = acc
          }
          setTakenDays(taken)
          // Prefill from existing editions so reopening shows current settings.
          setChoices((c) => {
            const next = { ...c }
            for (const sub of subscriptions || []) {
              const lm = LM_CATEGORIES.find((x) => x.account?.slug === sub.category_slug)
              if (!lm) continue
              next[lm.slug] = sub.weekday
                ? { rhythm: 'weekly', day: SHORT_DAY[sub.weekday] }
                : { rhythm: sub.rhythm || 'daily' }
              if (sub.source_preference) setSourcePref(sub.source_preference)
            }
            return next
          })
        })
        .catch(() => { })
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const topics = useMemo(() => selected.map((s) => lmCategoryBySlug(s)).filter(Boolean), [selected])
  const hasNewsTopic = topics.some((t) => isDailyOnly(t))

  const allSelected = selected.length === LM_CATEGORIES.length
  const toggleTopic = (slug) => {
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]))
    setChoices((c) => (c[slug]?.rhythm ? c : { ...c, [slug]: { rhythm: 'daily' } }))
  }
  // Subscribe all: everything defaults to Daily — one more click completes.
  const selectAll = () => {
    setSelected(LM_CATEGORIES.map((c) => c.slug))
    setChoices((c) => {
      const next = { ...c }
      for (const cat of LM_CATEGORIES) if (!next[cat.slug]?.rhythm) next[cat.slug] = { rhythm: 'daily' }
      return next
    })
  }

  const choiceComplete = (t) => {
    const c = choices[t.slug]
    if (!c?.rhythm) return false
    if (c.rhythm === 'daily') return true
    if (c.rhythm === 'weekly' || c.rhythm === 'both') {
      if (!c.day) return false
      return !dayOwner(c.day, t, choices, selected)
    }
    return false
  }
  const complete = topics.length > 0 && topics.every(choiceComplete)

  const setChoice = (slug, patch) =>
    setChoices((c) => ({ ...c, [slug]: { ...(c[slug] || {}), ...patch } }))

  const toggleDaily = (t) => {
    const c = choices[t.slug] || {}
    const dailyOn = c.rhythm === 'daily' || c.rhythm === 'both'
    const weeklyOn = c.rhythm === 'weekly' || c.rhythm === 'both'
    if (dailyOn) {
      if (weeklyOn) {
        setChoice(t.slug, { rhythm: 'weekly' })
      } else {
        toggleTopic(t.slug)
      }
    } else {
      if (weeklyOn) {
        setChoice(t.slug, { rhythm: 'both' })
      } else {
        setChoice(t.slug, { rhythm: 'daily', day: undefined })
      }
    }
  }

  const toggleWeekly = (t) => {
    const c = choices[t.slug] || {}
    const dailyOn = c.rhythm === 'daily' || c.rhythm === 'both'
    const weeklyOn = c.rhythm === 'weekly' || c.rhythm === 'both'
    if (weeklyOn) {
      if (dailyOn) {
        setChoice(t.slug, { rhythm: 'daily', day: undefined })
      } else {
        toggleTopic(t.slug)
      }
    } else {
      const day = c.day || freeDayFor(t, choices, selected) || 'fri'
      if (dailyOn) {
        setChoice(t.slug, { rhythm: 'both', day })
      } else {
        setChoice(t.slug, { rhythm: 'weekly', day })
      }
    }
  }

  const scheduleLabel = (t) => {
    const c = choices[t.slug] || {}
    if (c.rhythm === 'both') return `Daily + Weekly (${dayLabel(c.day)})`
    return c.rhythm === 'weekly' ? `Weekly · ${dayLabel(c.day)}` : 'Daily'
  }

  const confirm = async () => {
    if (!user && !email.trim()) { setError('Enter your email address.'); return }
    setBusy(true)
    setError('')
    try {
      if (user) {
        // ACCOUNT PATH — one newsletter_subscriptions row per topic.
        await ensureProfile()
        const failures = []
        for (const t of topics) {
          const c = choices[t.slug] || { rhythm: 'daily' }
          const categoryRow = { slug: t.account.slug, newsletter_type: t.account.type }
          try {
            await accountSubscribe(categoryRow, {
              rhythm: c.rhythm || 'daily',
              weekday: (c.rhythm === 'weekly' || c.rhythm === 'both') && c.day ? FULL_DAY[c.day] : undefined,
              send_days: (c.rhythm === 'weekly' || c.rhythm === 'both') && c.day ? [c.day] : undefined,
              source_preference: sourcePref,
            })
          } catch (err) {
            failures.push(`${t.title}: ${err.message}`)
          }
        }
        if (failures.length === topics.length) throw new Error(failures[0])
        if (failures.length) setError(failures.join(' · '))
      } else {
        // GUEST PATH — legacy subscribers table via the edge function.
        const seen = new Set()
        for (const t of topics) {
          const real = REAL_CATEGORY(t.slug)
          if (seen.has(real)) continue
          seen.add(real)
          const c = choices[t.slug] || { rhythm: 'daily' }
          await subscribeNewsletter({
            name: name.trim() || undefined,
            email: email.trim(),
            rhythm: c.rhythm || 'daily',
            send_days: (c.rhythm === 'weekly' || c.rhythm === 'both') && c.day ? [c.day] : undefined,
            categories: [real],
            source_preference: sourcePref,
          })
        }
      }
      markSubscribed(selected)
      setStep(3)
    } catch (e) {
      setError(e.message || 'Subscription failed — try again.')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => { setStep(1); setChoices({}); setSelected([]); setError('') }

  return (
    <LmDrawer open={open} onClose={() => { onClose(); reset() }} width={589} scrim={0.7}>
      <div className="flex min-h-full flex-col bg-[#F4F4F6]">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-lm-200 bg-white px-4 py-[16px] sm:px-[32px]">
          <div>
            <p className="font-bevietnam text-[12px] font-medium uppercase tracking-[1.5px] text-lm-500">
              {step === 3 ? 'All set' : `Step ${step} of 2`}
            </p>
            <p className="font-bevietnam text-[18px] font-medium text-lm-800">
              {step === 1 ? 'Setup your edition' : step === 2 ? 'Where should we send it?' : 'Added to My Editions'}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={() => { onClose(); reset() }} className="flex size-[32px] items-center justify-center rounded-full text-[22px] leading-none text-lm-500 hover:bg-black/5">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-[20px] sm:px-[24px]">
          {step === 1 && (
            <div className="flex flex-col gap-[16px]">
              {/* Topic picker */}
              <div className="flex flex-col gap-[10px] rounded-[16px] bg-white p-[16px]">
                <div className="flex items-center justify-between">
                  <p className="font-bevietnam text-[13px] font-semibold uppercase tracking-[1px] text-lm-500">
                    Your topics {selected.length > 0 && `· ${selected.length} selected`}
                  </p>
                  <button
                    type="button"
                    onClick={() => (allSelected ? setSelected([]) : selectAll())}
                    className={`rounded-[100px] px-[14px] py-[7px] font-bevietnam text-[12px] font-semibold ${allSelected ? 'border border-lm-300 text-lm-500' : 'bg-lm-800 text-white'
                      }`}
                  >
                    {allSelected ? 'Clear all' : 'Subscribe all'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-[8px]">
                  {LM_CATEGORIES.map((c) => {
                    const on = selected.includes(c.slug)
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => toggleTopic(c.slug)}
                        className={`flex items-center gap-[6px] rounded-[40px] border px-[12px] py-[8px] font-bevietnam text-[13px] font-medium transition-colors ${on ? 'border-lm-800 bg-lm-800 text-white' : 'border-lm-200 bg-white text-lm-600 hover:border-lm-400'
                          }`}
                      >
                        {!on && <span className="text-[14px] leading-none">+</span>}
                        {c.title}
                      </button>
                    )
                  })}
                </div>
                {topics.length === 0 && (
                  <p className="font-bevietnam text-[13px] text-lm-500">Pick at least one topic — or hit “Subscribe all”.</p>
                )}
              </div>

              {topics.map((t) => {
                const c = choices[t.slug] || {}
                return (
                  <div key={t.slug} className="flex flex-col gap-[10px] rounded-[16px] bg-white p-[16px]">
                    <p className="font-bevietnam text-[15px] font-semibold text-lm-800">{t.title}</p>

                    {isDailyOnly(t) ? (
                      // The Daily: daily mails only — a single, always-on option.
                      <OptionRow
                        label="Daily Deep Dive"
                        hint="10 key headlines every day"
                        selected
                        onClick={() => setChoice(t.slug, { rhythm: 'daily', day: undefined })}
                      />
                    ) : (
                      <>
                        <OptionRow
                          label="Daily Deep Dive"
                          hint="1 detailed story every day"
                          selected={c.rhythm === 'daily' || c.rhythm === 'both'}
                          onClick={() => toggleDaily(t)}
                        />
                        <OptionRow
                          label="Weekly Round-up"
                          hint="5 key headlines once a week"
                          selected={c.rhythm === 'weekly' || c.rhythm === 'both'}
                          onClick={() => toggleWeekly(t)}
                        />
                      </>
                    )}

                    {!isDailyOnly(t) && (c.rhythm === 'weekly' || c.rhythm === 'both') && (
                      <div className="flex flex-col gap-[8px] pt-[4px]">
                        <p className="font-bevietnam text-[13px] text-lm-500">Choose a delivery day</p>
                        <div className="flex flex-wrap gap-[8px]">
                          {DAYS.map(([id, label]) => {
                            const owner = dayOwner(id, t, choices, selected)
                            const active = c.day === id
                            return (
                              <button
                                key={id}
                                type="button"
                                disabled={!!owner}
                                title={owner ? `Taken by ${owner}` : undefined}
                                onClick={() => setChoice(t.slug, { day: id })}
                                className={`rounded-[40px] border px-[16px] py-[8px] font-bevietnam text-[13px] font-medium ${active
                                    ? 'border-lm-800 bg-lm-800 text-white'
                                    : owner
                                      ? 'cursor-not-allowed border-lm-200 bg-lm-50 text-lm-400 line-through'
                                      : 'border-lm-200 bg-white text-lm-600'
                                  }`}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>
                        {!isDailyOnly(t) && DAYS.some(([id]) => dayOwner(id, t, choices, selected)) && (
                          <p className="font-bevietnam text-[12px] text-lm-400">
                            Crossed-out days already carry another edition — one topic per day.
                          </p>
                        )}
                      </div>
                    )}

                    {getDeliveryMessage(t, c) && (
                      <p className="pt-[4px] font-bevietnam text-[13px] font-medium text-[#2563EB]">
                        {getDeliveryMessage(t, c)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-[16px]">
              <div className="flex flex-col gap-[10px] rounded-[16px] bg-white p-[16px]">
                <p className="font-bevietnam text-[13px] font-semibold uppercase tracking-[1px] text-lm-500">Your editions</p>
                {topics.map((t) => (
                  <div key={t.slug} className="flex items-center justify-between border-b border-dashed border-lm-300 pb-[8px] last:border-0 last:pb-0">
                    <span className="font-bevietnam text-[15px] font-medium text-lm-800">{t.title}</span>
                    <span className="font-bevietnam text-[13px] text-[#2563EB]">{scheduleLabel(t)}</span>
                  </div>
                ))}
              </div>

              {/* Source preference — applies to The Daily */}
              {hasNewsTopic && (
                <div className="flex flex-col gap-[8px] rounded-[16px] bg-white p-[16px]">
                  <p className="font-bevietnam text-[13px] font-semibold uppercase tracking-[1px] text-lm-500">Source mix</p>
                  {SOURCE_PREFERENCES.map((s) => (
                    <OptionRow
                      key={s.id}
                      label={s.label}
                      hint={s.desc}
                      selected={sourcePref === s.id}
                      onClick={() => setSourcePref(s.id)}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-[12px] rounded-[16px] bg-white p-[16px]">
                <p className="font-roboto text-[18px] font-medium text-lm-800" style={rb}>Where should we send it?</p>
                {user ? (
                  <p className="font-roboto text-[15px] text-lm-500" style={rb}>
                    Your editions will land in <span className="font-medium text-lm-800">{user.email}</span> and show up under My Editions.
                  </p>
                ) : (
                  <>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="w-full rounded-[60px] border border-lm-200 bg-white px-[20px] py-[13px] font-roboto text-[15px] outline-none placeholder:text-lm-400 focus:border-lm-700" style={rb} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address..." className="w-full rounded-[60px] border border-lm-200 bg-white px-[20px] py-[13px] font-roboto text-[15px] outline-none placeholder:text-lm-400 focus:border-lm-700" style={rb} />
                  </>
                )}
                <button type="button" onClick={() => setConsent(!consent)} className="flex items-start gap-[8px] text-left">
                  <span className={`mt-[2px] flex size-[18px] items-center justify-center rounded-[5px] border ${consent ? 'border-lm-800 bg-lm-800' : 'border-lm-300 bg-white'}`}>
                    {consent && <img alt="" src="/news-studio/figma/icon-tick-24.svg" className="size-[12px] invert" />}
                  </span>
                  <span className="font-roboto text-[13px] leading-[1.4] text-lm-500" style={rb}>
                    Send me the editions I picked and occasional product updates. Unsubscribe anytime.
                  </span>
                </button>
              </div>
              {error && <p className="font-bevietnam text-[13px] text-red-600">{error}</p>}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center gap-[16px] pt-[48px] text-center">
              <img alt="" src="/news-studio/figma/icon-tick-circle-success-96.svg" className="size-[96px]" />
              <p className="font-bevietnam text-[20px] font-semibold text-lm-800">Added to My Editions</p>
              <div className="flex w-full flex-col gap-[8px] rounded-[16px] bg-white p-[16px] text-left">
                {topics.map((t) => (
                  <div key={t.slug} className="flex items-center justify-between">
                    <span className="font-bevietnam text-[15px] font-medium text-lm-800">{t.title}</span>
                    <span className="font-bevietnam text-[13px] text-[#2563EB]">{scheduleLabel(t)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer bar */}
        <div className="border-t border-lm-200 bg-white px-4 py-[16px] sm:px-[32px]">
          {step === 1 && (
            <button
              type="button"
              disabled={!complete}
              onClick={() => setStep(2)}
              className={`h-[50px] w-full rounded-[35px] font-roboto text-[15px] font-semibold ${complete ? 'bg-lm-700 text-white shadow-[0px_6px_25px_0px_rgba(0,0,0,0.15)]' : 'bg-lm-200 text-lm-400'
                }`}
              style={rb}
            >
              Review {topics.length} {topics.length === 1 ? 'edition' : 'editions'}
            </button>
          )}
          {step === 2 && (
            <div className="flex gap-[8px]">
              <button type="button" onClick={() => setStep(1)} className="h-[50px] rounded-[35px] border border-lm-300 px-[20px] font-roboto text-[15px] font-semibold text-lm-600" style={rb}>
                Back
              </button>
              <button
                type="button"
                disabled={busy || !consent}
                onClick={confirm}
                className={`h-[50px] flex-1 rounded-[35px] font-roboto text-[15px] font-semibold ${busy || !consent ? 'bg-lm-200 text-lm-400' : 'bg-lm-700 text-white shadow-[0px_6px_25px_0px_rgba(0,0,0,0.15)]'}`}
                style={rb}
              >
                {busy ? 'Subscribing…' : 'Confirm subscription'}
              </button>
            </div>
          )}
          {step === 3 && (
            <div className="flex gap-[8px]">
              <button type="button" onClick={() => { onClose(); reset() }} className="h-[50px] flex-1 rounded-[35px] border border-lm-300 font-roboto text-[15px] font-semibold text-lm-600" style={rb}>
                Explore more topics
              </button>
              <button type="button" onClick={() => { onClose(); reset() }} className="h-[50px] flex-1 rounded-[35px] bg-lm-700 font-roboto text-[15px] font-semibold text-white" style={rb}>
                View my editions
              </button>
            </div>
          )}
        </div>
      </div>
    </LmDrawer>
  )
}
