import crypto from "node:crypto";
import { supportDb as db } from "./_lib/support-db.js";

const COOKIE = "dailymattr_admin";
const MAX_AGE = 60 * 60 * 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;
const PAGE = 1000;
// the values shipped in .env.example must never unlock a real deployment
const PLACEHOLDERS = new Set(["change-me-before-deploy", "replace-with-a-long-random-secret", "change-this-secret"]);

class ConfigError extends Error {}
class BadRequest extends Error {}

function requireDb() {
  const client = db();
  if (!client) throw new ConfigError("Admin database is not configured");
  return client;
}

/* Fail closed: with any of these missing, an empty login would match empty
 * env values and a fallback secret would let anyone sign a cookie. */
function config() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "").trim();
  const secret = String(process.env.ADMIN_SESSION_SECRET || "");
  if (!email || !password || PLACEHOLDERS.has(password)) throw new ConfigError("ADMIN_EMAIL / ADMIN_PASSWORD are not configured");
  if (secret.length < 32 || PLACEHOLDERS.has(secret)) throw new ConfigError("ADMIN_SESSION_SECRET must be a random string of 32+ characters");
  return { email, password, secret };
}

const b64 = (value) => Buffer.from(value).toString("base64url");
const sign = (value, secret) => crypto.createHmac("sha256", secret).update(value).digest("base64url");
const digest = (value) => crypto.createHash("sha256").update(String(value)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

function makeCookie(email, version, secret) {
  const payload = b64(JSON.stringify({ email, v: version, exp: Date.now() + MAX_AGE * 1000 }));
  return `${payload}.${sign(payload, secret)}`;
}
function setCookie(value, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${value}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
function readSession(req, cfg) {
  const raw = (req.headers.cookie || "").split(";").map((v) => v.trim()).find((v) => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const [payload, signature, extra] = raw.split(".");
  if (!payload || !signature || extra !== undefined || !safeEqual(signature, sign(payload, cfg.secret))) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { return null; }
  if (!(data.exp > Date.now()) || data.email !== cfg.email) return null;
  return data;
}

function hash(password, salt = crypto.randomBytes(16).toString("hex")) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (e, key) => e ? reject(e) : resolve(`${salt}:${key.toString("hex")}`)));
}
function verify(password, stored) {
  const [salt, hex] = String(stored || "").split(":");
  if (!salt || !hex) return false;
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (e, key) => {
    if (e) return reject(e);
    const expected = Buffer.from(hex, "hex");
    resolve(expected.length === key.length && crypto.timingSafeEqual(expected, key));
  }));
}

/* The single settings row holds a password set from the dashboard (which then
 * replaces ADMIN_PASSWORD) and a session version that logout and password
 * changes bump, so older cookies stop working. A missing table (migration not
 * applied yet) reads as "no row". */
const MISSING_TABLE = new Set(["42P01", "PGRST205"]);
async function loadSettings(client) {
  if (!client) return null;
  const { data, error } = await client.from("admin_settings").select("password_hash,session_version").eq("id", 1).maybeSingle();
  if (error) {
    if (MISSING_TABLE.has(error.code)) return null;
    throw error;
  }
  return data;
}
const versionOf = (settings) => settings?.session_version ?? 0;
async function bumpVersion(client, email, settings, extra = {}) {
  const version = versionOf(settings) + 1;
  const { error } = await client.from("admin_settings").upsert({ id: 1, email, session_version: version, updated_at: new Date().toISOString(), ...extra });
  if (error) throw error;
  return version;
}

/* Failed logins are counted per IP in the database so the limit holds across
 * serverless instances; the in-memory map covers a missing table or database. */
const memoryFailures = new Map();
const clientIp = (req) => String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
async function recentFailures(client, ip) {
  const since = Date.now() - LOGIN_WINDOW_MS;
  const local = (memoryFailures.get(ip) || []).filter((t) => t > since);
  memoryFailures.set(ip, local);
  if (!client) return local.length;
  const { count, error } = await client.from("admin_login_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", new Date(since).toISOString());
  return error ? local.length : Math.max(count || 0, local.length);
}
async function recordFailure(client, ip) {
  memoryFailures.set(ip, [...(memoryFailures.get(ip) || []), Date.now()]);
  if (!client) return;
  await client.from("admin_login_attempts").insert({ ip });
  await client.from("admin_login_attempts").delete().lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
}

const json = (res, status, body, headers = {}) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v)); res.end(JSON.stringify(body)); };
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
  } catch { throw new BadRequest("Send a valid JSON object"); }
};

async function allMessages(client) {
  const messages = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from("support_requests").select("id,created_at,name,email,topic,message").order("created_at", { ascending: false }).range(from, from + PAGE - 1);
    if (error) throw error;
    messages.push(...(data || []));
    if (!data || data.length < PAGE) return messages;
  }
}

export default async function handler(req, res) {
  try {
    const action = String(req.query?.action || "");
    const cfg = config();
    const client = db();
    if (req.method === "POST" && action === "login") {
      const ip = clientIp(req);
      if (await recentFailures(client, ip) >= LOGIN_MAX_FAILURES) return json(res, 429, { error: "Too many sign-in attempts. Please try again in 15 minutes." });
      const input = await body(req);
      const email = String(input.email || "").trim().toLowerCase();
      const password = String(input.password || "");
      if (!email || !password) return json(res, 400, { error: "Invalid email or password" });
      // Login works without Supabase; once a password has been set from the
      // dashboard, that stored hash replaces ADMIN_PASSWORD.
      const settings = await loadSettings(client);
      const validPassword = settings?.password_hash ? await verify(password, settings.password_hash) : safeEqual(password, cfg.password);
      if (!safeEqual(email, cfg.email) || !validPassword) {
        await recordFailure(client, ip);
        return json(res, 401, { error: "Invalid email or password" });
      }
      return json(res, 200, { ok: true }, { "Set-Cookie": setCookie(makeCookie(cfg.email, versionOf(settings), cfg.secret), MAX_AGE) });
    }
    const current = readSession(req, cfg);
    if (!current) return json(res, 401, { error: "Please log in" });
    const settings = await loadSettings(client);
    if ((current.v ?? 0) !== versionOf(settings)) return json(res, 401, { error: "Please log in" });
    if (req.method === "POST" && action === "password") {
      const input = await body(req);
      const password = String(input.password || "");
      if (password.length < 8) return json(res, 400, { error: "Password must be at least 8 characters" });
      const version = await bumpVersion(requireDb(), cfg.email, settings, { password_hash: await hash(password) });
      // other sessions are signed out; this one continues on the new version
      return json(res, 200, { ok: true }, { "Set-Cookie": setCookie(makeCookie(cfg.email, version, cfg.secret), MAX_AGE) });
    }
    if (req.method === "POST" && action === "logout") {
      if (client) await bumpVersion(client, cfg.email, settings);
      return json(res, 200, { ok: true }, { "Set-Cookie": setCookie("", 0) });
    }
    if (req.method === "GET" && action === "messages") {
      return json(res, 200, { messages: await allMessages(requireDb()) });
    }
    return json(res, 404, { error: "Unknown admin action" });
  } catch (error) {
    if (error instanceof BadRequest) return json(res, 400, { error: error.message });
    if (MISSING_TABLE.has(error.code)) return json(res, 503, {
      error: "Required database table is missing. Apply the support_requests and admin_settings migrations to the configured Supabase project.",
    });
    console.error("[admin]", error);
    const status = error instanceof ConfigError ? 503 : 500;
    return json(res, status, { error: "Admin service is not configured or unavailable" });
  }
}
