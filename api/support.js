import { supportDb } from "./_lib/support-db.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOPICS = ["Account or subscription", "App feedback", "Technical issue", "Something else"];
// best-effort per-instance throttle; the honeypot below catches most bots
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map();
const json = (res, status, data) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(data)); };
const clientIp = (req) => String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    let raw = req.body;
    if (raw === undefined || (raw && typeof raw === "object" && !Object.keys(raw).length)) {
      raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 32768) return json(res, 413, { error: "Your message is too long." });
      }
    }
    let data;
    try { data = typeof raw === "string" || Buffer.isBuffer(raw) ? JSON.parse(raw.toString() || "{}") : (raw || {}); }
    catch { return json(res, 400, { error: "We could not read your request." }); }
    if (!data || typeof data !== "object" || Array.isArray(data)) return json(res, 400, { error: "We could not read your request." });
    // hidden "website" field: people never see it, form-filling bots do
    if (String(data.website || "").trim()) return json(res, 201, { ok: true });
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const topic = String(data.topic || "").trim();
    const message = String(data.message || "").trim();
    if (name.length < 2 || name.length > 120) return json(res, 400, { error: "Please enter a valid name." });
    if (!EMAIL.test(email) || email.length > 254) return json(res, 400, { error: "Please enter a complete email address." });
    if (!TOPICS.includes(topic)) return json(res, 400, { error: "Please select a support topic." });
    if (message.length < 10 || message.length > 5000) return json(res, 400, { error: "Message must be between 10 and 5000 characters." });
    const ip = clientIp(req);
    const since = Date.now() - WINDOW_MS;
    const hits = (recent.get(ip) || []).filter((t) => t > since);
    if (hits.length >= MAX_PER_WINDOW) return json(res, 429, { error: "Too many requests. Please try again later or email support@dailymattr.com." });
    const db = supportDb();
    if (!db) return json(res, 503, { error: "Support service is not configured." });
    const { error } = await db.from("support_requests").insert({ name, email, topic, message });
    if (error) throw error;
    recent.set(ip, [...hits, Date.now()]);
    return json(res, 201, { ok: true });
  } catch (error) {
    console.error("[support]", error);
    return json(res, error.code === "PGRST205" ? 503 : 500, { error: error.code === "PGRST205" ? "Support database table is missing. Apply the support_requests migration." : "We could not send your request." });
  }
}
