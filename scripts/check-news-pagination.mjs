import assert from "node:assert/strict";

// Exercise the real Supabase query builder offline; no account or CMS data.
process.env.PIX_SUPABASE_URL = "https://pagination-test.supabase.co";
process.env.PIX_SUPABASE_SERVICE_ROLE_KEY = "offline-test-key";
const requests = [];
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  assert.equal(url.hostname, "pagination-test.supabase.co");
  requests.push(url);
  const offset = Number(url.searchParams.get("offset") || 0);
  const limit = Number(url.searchParams.get("limit"));
  // More than one PostgREST batch, all with the same publication time.
  const rows = Array.from({ length: Math.max(0, Math.min(limit, 1002 - offset)) }, (_, i) => ({
    id: offset + i + 1, published_id: offset + i + 1,
    headline: `Story ${offset + i + 1}`, published_at: "2026-09-01T12:00:00Z",
  }));
  return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json" } });
};

const { listBetween, listLive } = await import("../api/_lib/queries.js");
const rows = await listBetween("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z");
assert.equal(rows.length, 1002);
assert.equal(new Set(rows.map((row) => row.published_id)).size, 1002);
assert.deepEqual(requests.map((url) => url.searchParams.get("offset")), ["0", "1000"]);
for (const url of requests) {
  assert.equal(url.searchParams.get("order"), "published_at.asc,id.asc");
  assert.equal(url.searchParams.get("approved"), "eq.true");
  assert.equal(url.searchParams.get("rejected"), "eq.false");
}
requests.length = 0;
const feed = await listLive({ page: 2, size: 30 });
assert.equal(feed.posts.length, 30);
assert.equal(feed.hasNext, true);
assert.equal(requests[0].searchParams.get("offset"), "30");
assert.equal(requests[0].searchParams.get("order"), "published_at.desc,id.desc");
console.log("News pagination checks passed: stable tie ordering, multi-batch sitemap coverage and feed lookahead.");
