import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { subscribeNewsletter } from '../lib/subscribeApi'

const doodles = [
  { art: '✦', className: 'left-[5%] top-[16%] text-[#2F80ED] text-[42px] -rotate-12' },
  { art: '☻', className: 'right-[7%] top-[17%] text-[#F5A623] text-[44px] rotate-12' },
  { art: '✉', className: 'left-[8%] bottom-[23%] text-[#5A71FF] text-[42px] -rotate-12' },
  { art: '☕', className: 'right-[5%] bottom-[26%] text-[#FF7757] text-[38px] rotate-12' },
  { art: '⚡', className: 'left-[21%] top-[37%] text-[#FFC72C] text-[30px] rotate-12' },
  { art: '✎', className: 'right-[22%] top-[39%] text-[#6446D9] text-[38px] -rotate-12' },
]

export default function NewsletterSubscribePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!consent) {
      setError('Please confirm you are happy to receive the newsletter.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await subscribeNewsletter({
        name: name.trim() || undefined,
        email: email.trim(),
        rhythm: 'daily',
        categories: ['general'],
        source_preference: 'mixed',
      })
      setDone(true)
    } catch (err) {
      setError(err.message || 'We could not subscribe you just now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#fffdf8] font-bevietnam text-lm-800">
      <main className="relative isolate px-4 pb-16 pt-12 sm:px-8 sm:pt-16 lg:px-12 lg:pb-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-90px] top-[190px] size-[280px] rounded-full bg-[#FFE15B]/35 blur-3xl" />
          <div className="absolute right-[-100px] top-[110px] size-[320px] rounded-full bg-[#B9D7FF]/45 blur-3xl" />
          <div className="absolute bottom-[5%] left-[34%] size-[260px] rounded-full bg-[#AEEDE0]/30 blur-3xl" />
          {doodles.map((doodle, index) => (
            <motion.span
              key={doodle.art + index}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + index * 0.08, type: 'spring', stiffness: 220, damping: 16 }}
              className={`absolute hidden font-serif leading-none drop-shadow-sm lg:block ${doodle.className}`}
            >
              {doodle.art}
            </motion.span>
          ))}
          <svg className="absolute left-[10%] top-[29%] hidden h-[70px] w-[175px] lg:block" viewBox="0 0 175 70" fill="none">
            <path d="M5 57C32 18 49 70 73 34C92 5 119 41 170 8" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 8" />
            <path d="M163 5l8 3-5 7" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="mx-auto max-w-[1100px]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 text-center sm:mb-10"
          >
            <h1 className="mx-auto max-w-[780px] text-[42px] font-semibold leading-[0.98] tracking-[-0.055em] text-lm-800 sm:text-[64px] lg:text-[76px]">
              The news, minus the <span className="relative inline-block text-[#2F80ED]">noise<span aria-hidden className="absolute -bottom-2 left-0 h-[7px] w-full -rotate-2 rounded-full bg-[#2F80ED]/35" /></span>.
            </h1>
            <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-relaxed text-lm-600 sm:text-[18px]">
              A smart little read on the stories shaping your world — delivered fresh, clear and actually enjoyable.
            </p>
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative grid overflow-hidden rounded-[30px] border-2 border-lm-800 bg-white shadow-[8px_8px_0_#1c1c1e] lg:grid-cols-[0.86fr_1.14fr]"
          >
            <aside className="relative overflow-hidden border-b-2 border-lm-800 bg-[#6446D9] p-7 text-white sm:p-10 lg:border-b-0 lg:border-r-2 lg:p-11">
              <div aria-hidden className="absolute -right-12 -top-12 size-48 rounded-full border-[18px] border-[#FFCE57]" />
              <div aria-hidden className="absolute -bottom-16 -left-10 size-44 rounded-full border-[17px] border-[#75CDEE]" />
              <p className="relative text-[13px] font-bold uppercase tracking-[0.18em] text-white/75">Your new ritual</p>
              <h2 className="relative mt-4 max-w-[290px] text-[34px] font-semibold leading-[1.04] tracking-[-0.045em] sm:text-[40px]">Open your inbox to something good.</h2>
              <div className="relative mt-9 space-y-4">
                {[
                  ['🗞️', 'The big picture', 'A calm read of what matters today.'],
                  ['🍿', 'Culture & curious bits', 'The smart stuff you’ll want to share.'],
                  ['☀️', 'Your pace', 'Daily or weekly. Always your call.'],
                ].map(([emoji, title, copy]) => (
                  <div key={title} className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[18px] shadow-[2px_2px_0_rgba(28,28,30,.7)]">{emoji}</span>
                    <p className="text-[13px] leading-snug text-white/82"><strong className="block text-[14px] text-white">{title}</strong>{copy}</p>
                  </div>
                ))}
              </div>
              <p className="relative mt-10 text-[13px] font-medium text-white/80">No doomscrolling. No clutter. Unsubscribe whenever.</p>
            </aside>

            <div className="flex min-h-[300px] items-center p-6 sm:p-10 lg:p-11">
              {done ? (
                <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
                  <span className="flex size-20 items-center justify-center rounded-full border-2 border-lm-800 bg-[#AEEDE0] text-4xl shadow-[4px_4px_0_#1c1c1e]">🎉</span>
                  <h2 className="mt-7 text-[32px] font-semibold tracking-[-0.045em]">You’re on the list!</h2>
                  <p className="mt-3 max-w-[360px] leading-relaxed text-lm-600">Look out for a welcome note in <strong className="text-lm-800">{email}</strong>. Good reads are on their way.</p>
                  <button type="button" onClick={() => setDone(false)} className="mt-7 rounded-full border-2 border-lm-800 px-5 py-2.5 text-[14px] font-semibold shadow-[2px_2px_0_#1c1c1e] transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none">Add another email</button>
                </div>
              ) : (
                <form onSubmit={submit} className="w-full">
                  <img src="/news-studio/logo.svg" alt="dailymattr" className="mx-auto mb-10 h-auto w-[250px] max-w-full" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-[13px] font-semibold text-lm-700">First name <span className="font-normal text-lm-400">(optional)</span>
                      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="What should we call you?" className="mt-2 w-full rounded-xl border-2 border-lm-200 bg-[#fffdf8] px-4 py-3 text-[14px] outline-none transition focus:border-lm-800" />
                    </label>
                    <label className="block text-[13px] font-semibold text-lm-700">Email address
                      <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border-2 border-lm-200 bg-[#fffdf8] px-4 py-3 text-[14px] outline-none transition focus:border-lm-800" />
                    </label>
                  </div>

                  <label className="mt-7 flex cursor-pointer items-start gap-2.5 text-[12px] leading-relaxed text-lm-600">
                    <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-4 accent-[#6446D9]" />
                    <span>I’m happy to receive the newsletter and occasional updates. I can unsubscribe anytime.</span>
                  </label>
                  {error && <p role="alert" className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}
                  <button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-lm-800 bg-[#2F80ED] px-5 py-3.5 text-[15px] font-bold text-white shadow-[4px_4px_0_#1c1c1e] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1c1c1e] disabled:cursor-wait disabled:opacity-70">
                    {busy ? 'Sending your invite…' : <>Send me the good stuff <span className="text-lg">→</span></>}
                  </button>
                </form>
              )}
            </div>
          </motion.section>
          <p className="mt-8 text-center text-[12px] text-lm-500">Join readers making more sense of the day, one email at a time. <span className="ml-1 text-[#6446D9]">✦</span></p>
        </div>
      </main>
    </div>
  )
}
