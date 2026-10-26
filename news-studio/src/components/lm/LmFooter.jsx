import React from 'react'
import './LmFooter.css'

// Footer — mirrors the marketing site footer (index.html / api/_lib/layout.js)
// so News Studio pages end with the same brand block, link columns and
// wordmark. Links are plain <a> tags: every target lives outside the
// /news-studio router.
const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/dailymattr?stkn=MTF1bzNiZ25kNHJ6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@dailymattr?si=NUS1I012ywyA1c4u',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" /></svg>
    ),
  },
  {
    label: 'X',
    href: 'https://x.com/dailymattr_news',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.3-8.5L1 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L6.6 3.9H4.8L17.8 20Z" /></svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/dailymattr/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.45 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8V14.1c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.51V9.2h2.83v1.3h.04c.39-.74 1.36-1.53 2.79-1.53 2.98 0 3.58 1.96 3.58 4.51v5.27Z" /></svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61595620943543',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8.5V6.6c0-.8.2-1.3 1.4-1.3H17V2.2c-.3 0-1.3-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3v2.2H7.5V12h2.8v10h3.7V12h2.8l.4-3.5H14Z" /></svg>
    ),
  },
]

const COLUMNS = [
  {
    title: 'PRODUCT',
    links: [
      { label: 'Home', href: '/' },
      { label: 'About Us', href: '/about/' },
      { label: 'Editorial Team', href: '/author/dailymattr-editorial-team/' },
      { label: 'What we do', href: '/#showcase' },
      { label: 'Our features', href: '/#features' },
      { label: 'Newsletter', href: '/newsletter/' },
      { label: 'Support', href: '/support/' },
      { label: 'Android App (Google Play)', href: 'https://play.google.com/store/apps/details?id=com.dailymattr&pcampaignid=web_share', external: true },
      { label: 'iOS App (App Store)', href: 'https://apps.apple.com/in/app/dailymattr/id6791996138', external: true },
    ],
  },
  {
    title: 'NEWS',
    links: [
      { label: 'Latest', href: '/news/' },
      { label: 'India', href: '/news/india/' },
      { label: 'World', href: '/news/world/' },
      { label: 'Business', href: '/news/business/' },
      { label: 'Technology', href: '/news/technology/' },
      { label: 'Sports', href: '/news/sports/' },
      { label: 'Entertainment', href: '/news/entertainment/' },
      { label: 'Lifestyle', href: '/news/lifestyle/' },
      { label: 'States', href: '/news/states/' },
    ],
  },
  {
    title: 'LEGAL',
    links: [
      { label: 'Editorial Guidelines', href: '/editorialguidelines/' },
      { label: 'Privacy Policy', href: '/privacypolicy/' },
      { label: 'Terms & Conditions', href: '/termsandconditions/' },
    ],
  },
  {
    title: 'SUPPORT',
    className: 'footer-support',
    links: [
      { label: 'Get help', href: '/support/' },
      { label: 'support@dailymattr.com', href: 'mailto:support@dailymattr.com' },
    ],
  },
]

export default function LmFooter() {
  return (
    <footer className="footer" id="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <p className="footer-logoline">
            <a className="footer-logo-link" href="/">
              <img className="footer-logo" src="/assets/publisher-logo.png" width="156" height="32" alt="dailymattr" />
            </a>
            <span>your deeper read.</span>
          </p>
          <p className="footer-copy">
            dailymattr brings you the story behind the headline - with context, clarity, and perspective that help you
            understand what really matters.
          </p>
          <p className="footer-parent">
            <span style={{ color: '#3979ff' }}>dailymattr</span> is a part of{' '}
            <span className="legal-brand2">DRIDHA TECHNOLOGIES PRIVATE LIMITED</span>
          </p>
          <nav className="footer-socials" aria-label="Social media">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`} title={s.label}>
                {s.icon}
              </a>
            ))}
          </nav>
        </div>
        <div className="footer-cols">
          {COLUMNS.map((col) => (
            <div key={col.title} className={col.className ? `footer-col ${col.className}` : 'footer-col'}>
              <h4>{col.title}</h4>
              {col.links.map((l) =>
                l.external ? (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                ) : (
                  <a key={l.label} href={l.href}>{l.label}</a>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="footer-legal">
        © 2026 <span className="legal-brand">DRIDHA TECHNOLOGIES PRIVATE LIMITED</span>. All rights reserved.
      </p>
      <div className="footer-wordmark" aria-hidden="true">
        <img src="/assets/publisher-logo.png" width="156" height="32" alt="" />
      </div>
    </footer>
  )
}
