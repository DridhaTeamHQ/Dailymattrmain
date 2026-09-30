import { routeNews, errorPage } from "./_lib/router.js";
import { send, redirect301, param, CACHE } from "./_lib/http.js";

/* Vercel adapter. vercel.json rewrites /news and /news/* here, passing the
 * path tail as ?p= so the trailing slash survives the rewrite. */
export default async function handler(req, res) {
  /* read-only pages: HEAD is answered like GET (Node drops the body) */
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, { status: 405, type: "text", cache: CACHE.error, headers: { Allow: "GET, HEAD" }, body: "Method Not Allowed\n" });
  }
  try {
    const rest = param(req, "p");
    const out = await routeNews({
      rest,
      /* Vercel merges the visitor's query string into the rewrite, so a
       * ?bare=1 typed onto any other URL arrives here too — only the /news
       * rewrite (empty tail) may set it */
      bare: rest === "" && param(req, "bare") === "1",
      query: req.query || {},
    });
    if (out.status === 301) return redirect301(res, out.location);
    return send(res, out);
  } catch (err) {
    console.error("[news]", err);
    return send(res, { status: 500, cache: CACHE.error, body: errorPage(500) });
  }
}
