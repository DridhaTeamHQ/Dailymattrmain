import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const COOKIE = "dailymattr_admin";
const MAX_AGE = 60 * 60 * 8;

function db() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.PIX_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Admin database is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const b64 = (value) => Buffer.from(value).toString("base64url");
const sign = (value) => {
  if (!process.env.ADMIN_SESSION_SECRET) throw new Error("Admin session secret is not configured");
  return crypto.createHmac("sha256", process.env.ADMIN_SESSION_SECRET).update(value).digest("base64url");
};
function makeCookie(email) {
  const payload = b64(JSON.stringify({ email, exp: Date.now() + MAX_AGE * 1000 }));
  return `${payload}.${sign(payload)}`;
}
function session(req) {
  const raw = (req.headers.cookie || "").split(";").map((v) => v.trim()).find((v) => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const [payload, signature, extra] = raw.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload));
  const supplied = Buffer.from(signature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data?.email === "string" && Number.isFinite(data.exp) && data.exp > Date.now() ? data : null;
  } catch { return null; }
}
function hash(password, salt = crypto.randomBytes(16).toString("hex")) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (e, key) => e ? reject(e) : resolve(`${salt}:${key.toString("hex")}`)));
}
function verify(password, stored) {
  const [salt, hex] = String(stored || "").split(":");
  if (!salt || !hex) return false;
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (e, key) => {
    if (e) return reject(e);
    resolve(crypto.timingSafeEqual(Buffer.from(hex, "hex"), key));
  }));
}
const json = (res, status, body, headers = {}) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v)); res.end(JSON.stringify(body)); };
const body = async (req) => {
  try {
    let input = req.body;
    if (input === undefined) {
      input = "";
      for await (const chunk of req) {
        input += chunk;
        if (Buffer.byteLength(input) > 16384) throw new Error();
      }
    }
    const parsed = typeof input === "string" || Buffer.isBuffer(input) ? JSON.parse(input.toString() || "{}") : input;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw Object.assign(new Error("Send a valid JSON object"), { status: 400 }); }
};

export default async function handler(req, res) {
  try {
    res.setHeader("Cache-Control", "no-store");
    const action = String(req.query?.action || "");
    if (req.method === "POST" && action === "login") {
      const input = await body(req);
      const email = String(input.email || "").trim().toLowerCase();
      const password = String(input.password || "").trim();
      // Login is intentionally independent of Supabase. The fixed credentials
      // are controlled only through server-side environment variables.
      const validEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
      if (!validEmail || !process.env.ADMIN_PASSWORD) throw new Error("Admin credentials are not configured");
      const valid = email === validEmail && password === String(process.env.ADMIN_PASSWORD || "").trim();
      if (!valid) return json(res, 401, { error: "Invalid email or password" });
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      return json(res, 200, { ok: true }, { "Set-Cookie": `${COOKIE}=${makeCookie(email)}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}` });
    }
    const current = session(req);
    if (!current) return json(res, 401, { error: "Please log in" });
    if (req.method === "POST" && action === "password") {
      const input = await body(req);
      const password = String(input.password || "");
      if (password.length < 8) return json(res, 400, { error: "Password must be at least 8 characters" });
      const { error } = await db().from("admin_settings").upsert({ id: 1, email: current.email, password_hash: await hash(password), updated_at: new Date().toISOString() });
      if (error) throw error;
      return json(res, 200, { ok: true });
    }
    if (req.method === "POST" && action === "logout") return json(res, 200, { ok: true }, { "Set-Cookie": `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0` });
    if (req.method === "GET" && action === "messages") {
      const { data, error } = await db().from("support_requests").select("id,created_at,name,email,topic,message").order("created_at", { ascending: false });
      if (error) throw error;
      return json(res, 200, { messages: data || [] });
    }
    return json(res, 404, { error: "Unknown admin action" });
  } catch (error) {
    if (error.status === 400) return json(res, 400, { error: error.message });
    if (error.code === "PGRST205") return json(res, 503, {
      error: "Required database table is missing. Apply the support_requests and admin_settings migrations to the configured Supabase project.",
    });
    console.error("[admin]", error);
    return json(res, 500, { error: "Admin service is not configured or unavailable" });
  }
}
