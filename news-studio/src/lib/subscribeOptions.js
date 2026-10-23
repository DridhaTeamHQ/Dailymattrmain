// Canonical options for the newsletter subscribe form.
// These MUST stay in sync with the email agent's _shared/news-categories.ts.

export const SUBSCRIBE_CATEGORIES = [
  { slug: 'general', label: 'General' },
  { slug: 'real-estate', label: 'Real Estate' },
  { slug: 'automobile', label: 'Automobile' },
  { slug: 'health-wellness', label: 'Health & Wellness' },
  { slug: 'tech-ai', label: 'Tech & AI' },
  { slug: 'markets-startups', label: 'Markets & Startups' },
]

export const RHYTHMS = [
  { id: 'daily', label: 'Daily', desc: 'Get your newsletter every day.' },
  { id: 'weekly', label: 'Weekly', desc: 'Pick the day it arrives each week.' },
]

export const WEEKDAYS = [
  { id: 'mon', label: 'Monday' },
  { id: 'tue', label: 'Tuesday' },
  { id: 'wed', label: 'Wednesday' },
  { id: 'thu', label: 'Thursday' },
  { id: 'fri', label: 'Friday' },
  { id: 'sat', label: 'Saturday' },
  { id: 'sun', label: 'Sunday' },
]

export const SOURCE_PREFERENCES = [
  { id: 'top', label: 'Top sources only', desc: 'Curated from trusted major publishers.' },
  { id: 'mixed', label: 'Mixed sources', desc: 'Balanced mix of national, regional, and niche sources.' },
  { id: 'wide', label: 'Wide coverage', desc: 'More sources, more variety, wider viewpoints.' },
]
