import { cleanHeadline } from "./slug.js";
import { TIME_ZONE } from "./site.js";

/* detail_body is a run of "• point" lines separated by blank lines. Older
 * posts occasionally use "-" or "*" or no marker at all, so split on any
 * line break and strip whatever bullet glyph leads the line. */
export function bullets(body) {
  return String(body || "")
    .split(/\r?\n+/)
    .map((l) => cleanHeadline(l.replace(/^\s*[•\-\*·]\s*/, "")))
    .filter(Boolean);
}

export function truncateAtWord(s, max) {
  s = String(s || "").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return (end > max * 0.6 ? cut.slice(0, end) : cut).replace(/[\s,;:\-–—]+$/, "") + "…";
}

/* meta description: bullets joined with a space, cut cleanly at ~155 chars.
 * Punctuation is kept — Inshorts strips it and their snippets read badly. */
export const metaDescription = (points, max = 155) => truncateAtWord(points.join(" "), max);

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE, day: "numeric", month: "long", year: "numeric",
});

/* "19 September 2026", in Indian time. Date only — the exact minute is in the
 * <time datetime> attribute for machines, but readers don't need it. */
export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return dateFmt.format(d);
}

/* later of the two, so dateModified is never before datePublished */
export function modifiedAt(post) {
  const p = new Date(post.published_at || 0).getTime();
  const u = new Date(post.updated_at || 0).getTime();
  return new Date(Math.max(p, u)).toISOString();
}

export function hostnameOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export function isValidDateStr(str) {
  if (!str || typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function dateRangeForDay(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+05:30`);
  const end = new Date(`${dateStr}T23:59:59.999+05:30`);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function todayInTimezone() {
  const now = new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
