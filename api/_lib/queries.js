import { pixDb, hasServiceKey } from "./supabase.js";
import { snapshot, hasSnapshot } from "./snapshot.js";
import { PAGE_SIZE } from "./site.js";

/* Only the columns a page needs. The carousel and keywords are pulled out of
 * published_response with JSON-path aliases so the (large) blob itself never
 * crosses the wire. */
const COLS = [
  "id", "headline", "detail_body", "main_image_url", "category_id", "state_id",
  "published_at", "updated_at", "published_id", "source_url", "user_name",
  "approved", "rejected",
  /* web_pages: the rendered cards the CMS copies to the public Supabase
   * bucket at publish. media_pages: the same cards on the app backend's
   * private S3, kept for the day a CDN sits in front of it. */
  "web_pages",
  "media_pages:published_response->response->data->media_pages",
  "keywords:published_response->response->data->keywords",
].join(",");

const SITEMAP_COLS =
  "headline,published_id,published_at,updated_at,main_image_url,web_pages," +
  "media_pages:published_response->response->data->media_pages";

/* a post is public once QA approved it, nobody rejected it afterwards and
 * its publish time has passed */
const live = (q) =>
  q.eq("approved", true).eq("rejected", false)
    .not("published_at", "is", null).lte("published_at", new Date().toISOString());

const isLive = (p) => p.approved && !p.rejected && p.published_at && new Date(p.published_at) <= new Date();

const fail = (error, what) => { throw new Error(`${what}: ${error.message}`); };

/* Without the service-role key the real table is unreachable (no anon policy),
 * so development falls back to the checked-out snapshot. */
const useSnapshot = () => !hasServiceKey() && hasSnapshot();

export const dataSource = () => (hasServiceKey() ? "supabase" : useSnapshot() ? "snapshot" : "none");

const db = {
  /* { post } | { gone: true } (existed, no longer public) | null (never existed) */
  async getPostByPublishedId(id) {
    const { data, error } = await pixDb().from("pix_posts").select(COLS).eq("published_id", String(id)).limit(5);
    if (error) fail(error, "getPostByPublishedId");
    if (!data?.length) return null;
    const post = data.find(isLive);
    return post ? { post } : { gone: true };
  },

  async getRelated(categoryId, excludeId, limit = 8) {
    let q = live(pixDb().from("pix_posts").select(COLS)).neq("id", excludeId)
      .order("published_at", { ascending: false }).limit(limit);
    if (categoryId != null) q = q.eq("category_id", categoryId);
    const { data, error } = await q;
    if (error) fail(error, "getRelated");
    return data || [];
  },

  /* chronological neighbours within the same category */
  async getPrevNext(post) {
    const base = () => {
      let q = live(pixDb().from("pix_posts").select(COLS)).neq("id", post.id);
      if (post.category_id != null) q = q.eq("category_id", post.category_id);
      return q;
    };
    const [prev, next] = await Promise.all([
      base().lt("published_at", post.published_at).order("published_at", { ascending: false }).limit(1),
      base().gt("published_at", post.published_at).order("published_at", { ascending: true }).limit(1),
    ]);
    if (prev.error) fail(prev.error, "getPrev");
    if (next.error) fail(next.error, "getNext");
    return { prev: prev.data?.[0] || null, next: next.data?.[0] || null };
  },

  /* one page of the feed or a hub. Requests size+1 rows so "is there a next
   * page" costs no count query. */
  async listLive({ categoryId = null, page = 1, size = PAGE_SIZE } = {}) {
    const from = (page - 1) * size;
    let q = live(pixDb().from("pix_posts").select(COLS))
      .order("published_at", { ascending: false }).range(from, from + size);
    if (categoryId != null) q = q.eq("category_id", categoryId);
    const { data, error } = await q;
    if (error) fail(error, "listLive");
    const rows = data || [];
    return { posts: rows.slice(0, size), hasNext: rows.length > size };
  },

  /* Google News sitemap window: last 48 h, newest first, hard cap 1,000 */
  async listRecentForNews(hours = 48, cap = 1000) {
    const since = new Date(Date.now() - hours * 3600e3).toISOString();
    const { data, error } = await live(pixDb().from("pix_posts").select(SITEMAP_COLS))
      .gte("published_at", since).order("published_at", { ascending: false }).limit(cap);
    if (error) fail(error, "listRecentForNews");
    return data || [];
  },

  /* every live post in [start, end), oldest first. PostgREST caps a response
   * at 1,000 rows, so page through with range(). */
  async listBetween(startIso, endIso) {
    const out = [];
    const step = 1000;
    for (let from = 0; ; from += step) {
      const { data, error } = await live(pixDb().from("pix_posts").select(SITEMAP_COLS))
        .gte("published_at", startIso).lt("published_at", endIso)
        .order("published_at", { ascending: true }).range(from, from + step - 1);
      if (error) fail(error, "listBetween");
      out.push(...(data || []));
      if (!data || data.length < step) break;
    }
    return out;
  },
};

const pick = () => (useSnapshot() ? snapshot : db);

export const getPostByPublishedId = (...a) => pick().getPostByPublishedId(...a);
export const getRelated = (...a) => pick().getRelated(...a);
export const getPrevNext = (...a) => pick().getPrevNext(...a);
export const listLive = (...a) => pick().listLive(...a);
export const listRecentForNews = (...a) => pick().listRecentForNews(...a);
export const listBetween = (...a) => pick().listBetween(...a);
