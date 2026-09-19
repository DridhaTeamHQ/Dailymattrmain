/* Pix category_id -> public hub. The ids belong to the DailyMattr app's own
 * taxonomy (the Pixie CMS stores the number only). Labels were inferred from
 * the content in each bucket and confirmed against the CMS category picker;
 * a post whose id is not listed still gets an article page — it just isn't
 * filed under a hub and its breadcrumb skips the section level. */

export const CATEGORIES = [
  { id: 2,  slug: "india",         label: "India",         description: "The latest India news in short: politics, courts, policy and the stories shaping the country, fact-checked and human-picked." },
  { id: 1,  slug: "world",         label: "World",         description: "World news in short: the international stories that matter, explained in a few lines with the source linked." },
  { id: 3,  slug: "business",      label: "Business",      description: "Business and economy news in short: markets, companies, startups and money, fact-checked and human-picked." },
  { id: 15, slug: "technology",    label: "Technology",    description: "Technology news in short: gadgets, AI, apps and the internet, explained in a few lines." },
  { id: 6,  slug: "sports",        label: "Sports",        description: "Sports news in short: cricket, football, the Asian Games and more, fact-checked and human-picked." },
  { id: 4,  slug: "entertainment", label: "Entertainment", description: "Entertainment news in short: films, box office, OTT and celebrities, explained in a few lines." },
  { id: 11, slug: "lifestyle",     label: "Lifestyle",     description: "Lifestyle news in short: health, culture, fashion and ideas worth knowing, fact-checked and human-picked." },
  { id: 8,  slug: "states",        label: "States",        description: "Regional news from across India's states in short, fact-checked and human-picked." },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));
const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));

export const categoryById = (id) => byId.get(Number(id)) || null;
export const categoryBySlug = (slug) => bySlug.get(String(slug || "").toLowerCase()) || null;
export const hubPath = (cat) => `/news/${cat.slug}/`;
