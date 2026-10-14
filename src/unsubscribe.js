/* /unsubscribe — the personal link in every newsletter and welcome email.
 * The email sender signs the token; this page never creates, checks or
 * stores it. It reads email/token/action from its own URL and forwards them
 * to the unsubscribe edge function, which does the real work. The email and
 * token go nowhere else (no analytics on this page, no logging). */
const API_URL = "https://ygxdrphajvrbjcaxhvcn.supabase.co/functions/v1/unsubscribe";
const ACTIONS = ["unsubscribe", "delete", "resubscribe"];

const SUCCESS = {
  unsubscribe: {
    title: "You have unsubscribed",
    text: "You will no longer receive emails from dailymattr.",
    resubscribe: true,
  },
  resubscribe: {
    title: "You're subscribed again",
    text: "Your next newsletter arrives tomorrow morning.",
  },
  delete: {
    title: "Your data has been deleted",
    text: "Your dailymattr subscriber record and delivery history have been removed.",
  },
};

const loadingPanel = document.getElementById("unsub-loading");
const successPanel = document.getElementById("unsub-success");
const errorPanel = document.getElementById("unsub-error");
const resubscribeButton = document.getElementById("unsub-resubscribe");

const params = new URLSearchParams(window.location.search);
const email = (params.get("email") || "").trim();
const token = (params.get("token") || "").trim();
const requested = (params.get("action") || "unsubscribe").trim().toLowerCase();
const action = ACTIONS.includes(requested) ? requested : "unsubscribe";

let inFlight = false;

function show(panel) {
  for (const p of [loadingPanel, successPanel, errorPanel]) p.hidden = p !== panel;
}

function showError(message) {
  document.getElementById("unsub-error-text").textContent =
    message || "Invalid or expired unsubscribe link.";
  show(errorPanel);
}

function showSuccess(done, data) {
  const copy = SUCCESS[done];
  document.getElementById("unsub-success-title").textContent = copy.title;
  document.getElementById("unsub-success-text").textContent = copy.text;
  // can_resubscribe: false means the address was never a subscriber
  resubscribeButton.hidden = !copy.resubscribe || data?.can_resubscribe === false;
  resubscribeButton.disabled = false;
  show(successPanel);
}

async function run(next) {
  // one request at a time: covers double clicks and a double-run module
  if (inFlight) return;
  inFlight = true;
  show(loadingPanel);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, action: next }),
      referrerPolicy: "no-referrer",
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) showSuccess(next, data);
    else showError(data?.error);
  } catch {
    showError("We couldn't reach our servers. Check your connection and open the link again.");
  } finally {
    inFlight = false;
  }
}

if (email) {
  document.getElementById("unsub-email").textContent = email;
  document.getElementById("unsub-email-row").hidden = false;
}

resubscribeButton.addEventListener("click", () => {
  resubscribeButton.disabled = true;
  run("resubscribe");
});

if (!email || !token) {
  showError("Missing email or token.");
} else {
  run(action);
}
