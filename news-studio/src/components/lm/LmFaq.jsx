import React, { useState } from 'react'
import { useLmDrawer } from './LmDrawerContext'
import Reveal from './Reveal'

// FAQ — Figma node 1:226 (1440x749). Left: eyebrow + H2 + blurb + dark pills.
// Right: filter chips + #FAFAFB accordion with dashed dividers.
const rb = { fontVariationSettings: '"wdth" 100' }
const GLOW = '/news-studio/figma/faq-button-glow.svg'

const FAQ_GROUPS = {
  General: [
    { q: 'What is dailymattr?', a: 'dailymattr is a premium newsletter experience for deeper stories, useful context, and curated perspectives.' },
    { q: 'What will I receive?', a: 'A daily case study and short, sharp stories from the categories you pick — written to be read in minutes, not scrolled past.' },
    { q: 'Do I need an account to subscribe?', a: 'You can subscribe with just your email. Creating an account lets you manage categories, delivery days, and pause anytime.' },
    { q: 'How often will I get newsletters?', a: 'The Daily lands every morning. The Weekly arrives once a week on the day you choose.' },
    { q: 'Can I choose my categories?', a: 'Yes — pick any mix of categories and change them whenever you like from your profile.' },
  ],
  Subscription: [
    { q: 'Is dailymattr free?', a: 'Yes. Subscribing to the daily and weekly editions is free.' },
    { q: 'How do I unsubscribe?', a: 'Every email has a one-click unsubscribe link, or you can manage subscriptions from your profile.' },
    { q: 'Can I pause instead of unsubscribing?', a: 'Yes — unsubscribe from individual categories and keep the rest running.' },
  ],
  Personalization: [
    { q: 'Can I change categories later?', a: 'Anytime. Your edition rebuilds automatically from your latest picks.' },
    { q: 'Can I follow more than one category?', a: 'Yes, follow as many as you like — each lands as its own tidy section.' },
  ],
  Delivery: [
    { q: 'When do editions arrive?', a: 'The Daily is sent at 9:00 AM IST. Weekly category editions arrive on the weekday you choose.' },
    { q: 'What if an edition has no new stories?', a: 'We skip empty sends — you only hear from us when there’s something worth reading.' },
  ],
}

export default function LmFaq() {
  const { openSubscribe } = useLmDrawer()
  const [chip, setChip] = useState('General')
  const [open, setOpen] = useState(0)
  const items = FAQ_GROUPS[chip]

  return (
    <section id="faq" className="bg-white">
      <div className="mx-auto grid w-full max-w-[1394px] grid-cols-1 gap-10 px-4 py-[56px] sm:px-8 sm:py-[84px] lg:grid-cols-[minmax(0,471px)_minmax(0,609px)] lg:justify-between lg:gap-10">
        {/* Left column */}
        <Reveal className="flex flex-col gap-[24px]">
          <div className="relative inline-grid place-items-start">
            <p className="font-bevietnam text-[15px] font-semibold leading-[1.26] tracking-[2.7px] text-black sm:text-[18px]">
              <span className="bg-black px-[2px] text-white">QUESTIONS,</span> ANSWERED
            </p>
          </div>
          <h2 className="font-bevietnam text-[40px] font-medium leading-[1.26] tracking-[-0.05em] text-lm-800 sm:text-[clamp(40px,3.9vw,56px)]">
            Frequently asked<br />questions
          </h2>
          <p className="max-w-[453px] font-bevietnam text-[18px] leading-[1.46] text-lm-600">
            Learn how dailymattr works, what you’ll receive, how to choose categories, and how to manage your editions anytime.
          </p>
          <div className="mt-[24px] flex items-center gap-[8px]">
            <button
              type="button"
              onClick={() => openSubscribe([])}
              className="relative flex items-center justify-center overflow-hidden rounded-[50px] border border-white/10 bg-lm-700 px-[24px] py-[16px] font-roboto text-[15px] font-semibold text-white shadow-[0px_6px_25px_0px_rgba(0,0,0,0.25)]"
              style={rb}
            >
              <span aria-hidden className="pointer-events-none absolute left-[-71px] top-[62px] h-[8px] w-[251px]"><img alt="" src={GLOW} className="block size-full max-w-none" /></span>
              Subscribe
            </button>
            <button
              type="button"
              onClick={() => openSubscribe([])}
              aria-label="Get it in your inbox"
              className="relative flex items-center justify-center overflow-hidden rounded-[50px] border border-white/10 bg-lm-700 p-[16px] shadow-[0px_6px_25px_0px_rgba(0,0,0,0.25)]"
            >
              <span aria-hidden className="pointer-events-none absolute left-[-71px] top-[62px] h-[8px] w-[251px]"><img alt="" src={GLOW} className="block size-full max-w-none" /></span>
              <img alt="" src="/news-studio/figma/faq-icon-direct-inbox.svg" className="size-[18px]" />
            </button>
          </div>
        </Reveal>

        {/* Right column */}
        <Reveal delay={0.15} className="flex flex-col gap-[16px]">
          <div className="flex flex-wrap items-center gap-[8px]">
            {Object.keys(FAQ_GROUPS).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setChip(c); setOpen(0) }}
                className={`rounded-[100px] border border-solid px-[12px] py-[8px] font-bevietnam text-[13px] font-medium ${
                  chip === c ? 'border-lm-300 bg-lm-800 text-white' : 'border-lm-300 text-lm-500 hover:text-lm-800'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex w-full flex-col gap-[5px] rounded-[24px] border border-lm-200 bg-lm-50 py-[16px]">
            {items.map((item, i) => {
              const isOpen = open === i
              const last = i === items.length - 1
              return (
                <div key={item.q} className={`flex flex-col px-[24px] ${last ? '' : 'border-b border-dashed border-lm-400'}`}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 py-[15.5px] text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-roboto text-[17px] font-medium text-lm-800 sm:text-[21px]" style={rb}>{item.q}</span>
                    <img alt="" src={isOpen ? '/news-studio/figma/faq-icon-minus.svg' : '/news-studio/figma/faq-icon-plus.svg'} className="size-[16px] shrink-0" />
                  </button>
                  {isOpen && (
                    <p className="max-w-[588px] pb-[15.5px] font-roboto text-[17px] leading-[1.46] text-lm-600 sm:text-[21px]" style={rb}>
                      {item.a}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
