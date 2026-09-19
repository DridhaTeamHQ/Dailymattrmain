import { routeNews } from "./_lib/router.js";
import { send, redirect301, param, CACHE } from "./_lib/http.js";
import { renderError } from "./_lib/render-error.js";

/* Vercel adapter. vercel.json rewrites /news and /news/* here, passing the
 * path tail as ?p= so the trailing slash survives the rewrite. */
export default async function handler(req, res) {
  try {
    const out = await routeNews({
      rest: param(req, "p"),
      bare: param(req, "bare") === "1",
    });
    if (out.status === 301) return redirect301(res, out.location);
    return send(res, out);
  } catch (err) {
    console.error("[news]", err);
    return send(res, { status: 500, cache: CACHE.error, body: String(renderError(500)) });
  }
}
