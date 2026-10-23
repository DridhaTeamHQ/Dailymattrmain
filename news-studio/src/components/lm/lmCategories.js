// dailymattr category registry — the site's 6 REAL content categories
// (general daily wrap + the 5 agent topics). `slug` is the /:category
// route; `feed` tells CategoryNewsPage what to load; `account` maps to the
// newsletter_categories row used for signed-in subscriptions.
export const LM_CATEGORIES = [
  {
    // Renamed from "General" 2026-07 — slug/route stay /general so links hold.
    slug: 'general',
    tile: '/news-studio/figma/menu/international.png',
    title: 'News Studio',
    hero: 'News Studio',
    desc: "The day's biggest stories across India, world, business, sports and tech — in ten sharp reads.",
    bg: '#FFF2EB',
    image: '/news-studio/figma/category-international.png',
    imageBase: '/news-studio/figma/category-international-base.png',
    feed: { general: true },
    account: { slug: 'national', type: 'news_rhythm' },
  },
  {
    slug: 'real-estate',
    tile: '/news-studio/figma/menu/real-estate.png',
    title: 'Real Estate',
    hero: 'Real Estate',
    desc: 'Launches, handovers, infrastructure, and regulation across India’s big property markets.',
    bg: '#EBF4FF',
    image: '/news-studio/figma/category-real-estate.png',
    feed: { category: 'Real Estate' },
    account: { slug: 'real-estate', type: 'category_small_articles' },
  },
  {
    slug: 'automobile',
    tile: '/news-studio/figma/menu/automobile.png',
    title: 'Automobile',
    hero: 'Automobile',
    desc: 'Launches, EVs, sales trends, and the policy moves steering what India drives next.',
    bg: '#FFF0F0',
    image: '/news-studio/figma/category-automobile.png',
    feed: { category: 'Automobile' },
    account: { slug: 'automobile', type: 'category_small_articles' },
  },
  {
    slug: 'health-wellness',
    tile: '/news-studio/figma/menu/wellness-daily.png',
    title: 'Health & Wellness',
    hero: 'Health & Wellness',
    desc: 'Evidence-led health, fitness, sleep, and mental-wellness stories for working professionals.',
    bg: '#E9F4EB',
    image: '/news-studio/figma/category-wellness.png',
    feed: { category: 'Health & Wellness' },
    account: { slug: 'health-wellness', type: 'category_small_articles' },
  },
  {
    slug: 'tech-ai',
    tile: '/news-studio/figma/menu/technology-ai.png',
    title: 'Tech & AI',
    hero: 'Tech & AI',
    desc: 'Technology and AI that actually touches your work, money, and daily life — minus the hype.',
    bg: '#ECE6F0',
    image: '/news-studio/figma/category-tech-ai.png',
    feed: { category: 'Tech & AI' },
    account: { slug: 'tech-ai', type: 'category_small_articles' },
  },
  {
    slug: 'markets-startups',
    tile: '/news-studio/figma/menu/money-matters.png',
    title: 'Markets & Startups',
    hero: 'Markets & Startups',
    desc: 'Markets, IPOs, funding rounds, and the startup economy — one sharp, source-bound read at a time.',
    bg: '#F5F0FF',
    image: '/news-studio/figma/category-money-markets.png',
    feed: { category: 'Markets & Startups' },
    account: { slug: 'markets-startups', type: 'category_small_articles' },
  },
]

export const lmCategoryBySlug = (slug) => LM_CATEGORIES.find((c) => c.slug === slug) || null
