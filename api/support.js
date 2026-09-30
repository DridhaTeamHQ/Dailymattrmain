import { createClient } from "@supabase/supabase-js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOPICS = ["Account or subscription", "App feedback", "Technical issue", "Something else"];
const json = (res, status, data) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(data)); };
export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    let raw = req.body;
    if (raw === undefined || (raw && typeof raw === "object" && !Object.keys(raw).length)) {
      raw = "";
      for await (const chunk of req) raw += chunk;
    }
    const data = typeof raw === "string" || Buffer.isBuffer(raw) ? JSON.parse(raw.toString() || "{}") : (raw || {});
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const topic = String(data.topic || "").trim();
    const message = String(data.message || "").trim();
    if (name.length < 2 || name.length > 120) return json(res, 400, { error: "Please enter a valid name." });
    if (!EMAIL.test(email) || email.length > 254) return json(res, 400, { error: "Please enter a complete email address." });
    if (!TOPICS.includes(topic)) return json(res, 400, { error: "Please select a support topic." });
    if (message.length < 10 || message.length > 5000) return json(res, 400, { error: "Message must be between 10 and 5000 characters." });
    const url = process.env.PIX_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.PIX_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return json(res, 503, { error: "Support service is not configured." });
    const { error } = await createClient(url, key, { auth: { persistSession: false } }).from("support_requests").insert({ name, email, topic, message });
    if (error) throw error;
    return json(res, 201, { ok: true });
  } catch (error) {
    console.error("[support]", error);
    return json(res, error.code === "PGRST205" ? 503 : 500, { error: error.code === "PGRST205" ? "Support database table is missing. Apply the support_requests migration." : "We could not send your request." });
  }
}
