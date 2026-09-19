/* Tiny HTML templating: a tagged template that escapes every interpolation
 * unless it was explicitly marked raw(). Every string that reaches these
 * pages comes from the CMS database and is untrusted. */

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

class Raw { constructor(s) { this.s = String(s); } toString() { return this.s; } }
export const raw = (s) => new Raw(s);

const render = (v) => {
  if (v == null || v === false) return "";
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join("");
  return esc(v);
};

export function html(strings, ...values) {
  let out = "";
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) out += render(values[i]);
  }
  return new Raw(out);
}

/* JSON-LD lives inside a <script>, where a "</script>" in a headline would
 * close the block early and where U+2028/U+2029 are valid JSON but illegal
 * in a JS string literal. JSON.stringify escapes neither. The separators are
 * built from char codes so no editor or transform can mangle them. */
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const UNSAFE = new RegExp(`[<${LS}${PS}]`, "g");
const UNSAFE_MAP = { "<": "\\u003c", [LS]: "\\u2028", [PS]: "\\u2029" };

export const safeJsonLd = (obj) => JSON.stringify(obj).replace(UNSAFE, (c) => UNSAFE_MAP[c]);

export const jsonLdScript = (obj) =>
  raw(`<script type="application/ld+json">${safeJsonLd(obj)}</script>`);

/* only http(s) URLs are ever emitted as href/src */
export function safeUrl(u) {
  try {
    const url = new URL(String(u));
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch { return ""; }
}
