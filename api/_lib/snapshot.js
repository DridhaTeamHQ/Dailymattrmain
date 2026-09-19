import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* Local development fallback. pix_posts has no anon read policy, so without
 * PIX_SUPABASE_SERVICE_ROLE_KEY there is no way to reach the real database —
 * this serves a checked-out sample of live posts instead, so the pages can be
 * built and reviewed offline. Production always has the key and never gets
 * here. Regenerate with scripts/pull-pix-snapshot.mjs. */

const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "_data", "pix-snapshot.json");

let cache;
export const hasSnapshot = () => existsSync(FILE);

function all() {
  if (!cache) {
    cache = JSON.parse(readFileSync(FILE, "utf8"))
      .filter((p) => p.approved && !p.rejected && p.published_at)
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  }
  return cache;
}

const inCategory = (p, categoryId) => categoryId == null || p.category_id === categoryId;

export const snapshot = {
  async getPostByPublishedId(id) {
    const post = all().find((p) => String(p.published_id) === String(id));
    return post ? { post } : null;
  },
  async getRelated(categoryId, excludeId, limit = 8) {
    return all().filter((p) => p.id !== excludeId && inCategory(p, categoryId)).slice(0, limit);
  },
  async getPrevNext(post) {
    const siblings = all().filter((p) => inCategory(p, post.category_id));
    const i = siblings.findIndex((p) => p.id === post.id);
    return { prev: siblings[i + 1] || null, next: i > 0 ? siblings[i - 1] : null };
  },
  async listLive({ categoryId = null, page = 1, size = 30 } = {}) {
    const rows = all().filter((p) => inCategory(p, categoryId));
    const from = (page - 1) * size;
    return { posts: rows.slice(from, from + size), hasNext: rows.length > from + size };
  },
  async listRecentForNews(hours = 48, cap = 1000) {
    const since = Date.now() - hours * 3600e3;
    return all().filter((p) => new Date(p.published_at).getTime() >= since).slice(0, cap);
  },
  async listBetween(startIso, endIso) {
    const s = new Date(startIso).getTime(), e = new Date(endIso).getTime();
    return all()
      .filter((p) => { const t = new Date(p.published_at).getTime(); return t >= s && t < e; })
      .sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
  },
};
