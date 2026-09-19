/* Refresh api/_data/pix-snapshot.json — the offline sample used by the dev
 * server when PIX_SUPABASE_SERVICE_ROLE_KEY isn't set.
 *
 *   node scripts/pull-pix-snapshot.mjs [count]
 *
 * Needs PIX_SUPABASE_URL and PIX_SUPABASE_SERVICE_ROLE_KEY in the environment
 * (or .env.local). Not required to run the site — the committed snapshot is
 * enough to develop against, and production reads the database directly. */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const f of [".env.local", ".env"]) {
  const p = join(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

const { PIX_SUPABASE_URL: url, PIX_SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key) {
  console.error("Set PIX_SUPABASE_URL and PIX_SUPABASE_SERVICE_ROLE_KEY (see .env.example).");
  process.exit(1);
}

const count = Number(process.argv[2]) || 220;
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await db
  .from("pix_posts")
  .select([
    "id", "headline", "detail_body", "main_image_url", "category_id", "state_id",
    "published_at", "updated_at", "published_id", "source_url", "user_name",
    "approved", "rejected",
    "media_pages:published_response->response->data->media_pages",
    "keywords:published_response->response->data->keywords",
  ].join(","))
  .eq("approved", true).eq("rejected", false).not("published_at", "is", null)
  .order("published_at", { ascending: false })
  .limit(count);

if (error) { console.error(error.message); process.exit(1); }

const out = join(root, "api", "_data", "pix-snapshot.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data));

const cats = {};
for (const p of data) cats[p.category_id] = (cats[p.category_id] || 0) + 1;
console.log(`wrote ${data.length} posts -> api/_data/pix-snapshot.json`);
console.log("by category_id:", cats);
