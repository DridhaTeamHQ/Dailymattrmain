import { html } from "./html.js";

const COPY = {
  404: { h: "Story not found", p: "This link doesn't match any story we've published." },
  410: { h: "This story is no longer available", p: "It was taken down after publication." },
  500: { h: "Something went wrong", p: "Please try again in a moment." },
};

export const renderError = (status) => {
  const c = COPY[status] || COPY[500];
  return html`
    <div class="news-wrap news-empty">
      <h1>${c.h}</h1>
      <p>${c.p} Head back to <a href="/news/">the latest news</a> or the <a href="/">home page</a>.</p>
    </div>
`;
};
