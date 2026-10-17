// Homepage "Latest news": the newest stories from /news/latest.json, each
// with its own Pix artwork and a link to its article page. Text is set with
// textContent only — every field comes from the database.

const section = document.getElementById("latest");
const row = section?.querySelector(".trend-row");

const PIX_STORAGE = "https://coggfnbqqyiqfsxvtaym.supabase.co/storage/v1/";

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const dateFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

/* picture on top (never covered), section chip on the picture, headline and
 * date on white below — the whole card is one link */
function card(s) {
  const li = el("li");
  const a = el("a", "lnews-card");
  // only our own article pages are ever linked
  a.href = /^\/news\/[a-z0-9-]+-\d{1,12}$/.test(s.path) ? s.path : "/news/";

  const media = el("span", "lnews-media");
  // our own Pix artwork only — the server checks the host too
  const img = s.image;
  if (img && typeof img.src === "string" && img.src.startsWith(PIX_STORAGE)) {
    const i = el("img");
    i.src = img.src;
    if (typeof img.srcset === "string") i.srcset = img.srcset;
    i.sizes = "(max-width: 640px) 78vw, 280px";
    i.alt = "";
    i.loading = "lazy";
    i.decoding = "async";
    media.append(i);
  }
  if (s.section) media.append(el("span", "lnews-chip", s.section));

  const body = el("span", "lnews-body");
  const meta = el("span", "lnews-meta");
  const when = el("time", null, s.publishedAt ? dateFmt.format(new Date(s.publishedAt)) : "");
  if (s.publishedAt) when.dateTime = s.publishedAt;
  meta.append(when, el("span", "lnews-go", "Read story →"));
  body.append(el("span", "lnews-title", s.title), meta);

  a.append(media, body);
  li.append(a);
  return li;
}

function arrows() {
  const nav = section.querySelector(".trend-arrows");
  const [prev, next] = nav.querySelectorAll("button");
  const sync = () => {
    const max = row.scrollWidth - row.clientWidth;
    nav.hidden = max <= 4;
    prev.disabled = row.scrollLeft <= 4;
    next.disabled = row.scrollLeft >= max - 4;
  };
  nav.addEventListener("click", (e) => {
    const b = e.target.closest("[data-trend-step]");
    if (!b) return;
    const first = row.querySelector("li");
    const step = first ? first.getBoundingClientRect().width + 16 : row.clientWidth * 0.8;
    row.scrollBy({ left: step * Number(b.dataset.trendStep), behavior: "smooth" });
  });
  row.addEventListener("scroll", sync, { passive: true });
  addEventListener("resize", sync);
  sync();
}

if (section && row) {
  fetch("/news/latest.json", { headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const stories = Array.isArray(data?.stories) ? data.stories : [];
      if (!stories.length) return;
      row.replaceChildren(...stories.map(card));
      section.hidden = false;
      arrows();
      // the pinned features section above measures the page; let it re-measure
      window.dispatchEvent(new Event("resize"));
    })
    .catch(() => {});
}
